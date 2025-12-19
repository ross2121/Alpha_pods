use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use futures::StreamExt;
use log::{info, error, warn};
use anyhow::{Result, Context};
use uuid::Uuid;

use yellowstone_grpc_client::GeyserGrpcClient;
use yellowstone_grpc_proto::prelude::{
    SubscribeRequest, SubscribeRequestFilterAccounts,
    SubscribeUpdateAccount,
    subscribe_update::UpdateOneof, CommitmentLevel,
};
use tonic::transport::ClientTlsConfig;

use store::Store;
use sqlx::PgPool;


pub struct AccountIndexer {
    grpc_endpoint: String,
    x_token: Option<String>,
    store: Arc<Store>,
    user_accounts: Arc<Mutex<Vec<String>>>,
}

#[derive(Debug, Clone)]
pub struct IndexerConfig {
    pub grpc_endpoint: String,
    pub database_url: String,
    pub x_token: Option<String>,
    pub commitment_level: CommitmentLevel,
}

impl AccountIndexer {
    pub async fn new(config: IndexerConfig) -> Result<Self> {
        // Initialize database connection
        let pool = PgPool::connect(&config.database_url)
            .await
            .context("Failed to connect to database")?;
        
        let store = Arc::new(Store::new(pool));
        
        // Initialize user system (tables and default assets)
        store.init_user_system().await
            .context("Failed to initialize user system")?;

        // Load existing user public keys from database
        let user_accounts = store.get_all_user_pubkeys().await
            .context("Failed to load user pubkeys from database")?;
        
        info!("Loaded {} existing user accounts from database", user_accounts.len());

        Ok(Self {
            grpc_endpoint: String::new(),
            x_token: None,
            store,
            user_accounts: Arc::new(Mutex::new(user_accounts)),
        })
    }
    pub async fn connect_and_start(&mut self, config: &IndexerConfig) -> Result<()> {
        self.grpc_endpoint = config.grpc_endpoint.clone();
        self.x_token = config.x_token.clone();
        
        info!("Starting connection to Yellowstone gRPC server: {}", config.grpc_endpoint);
        self.start_indexing(config).await
    }

    /// Start the indexer with account subscription
    pub async fn start_indexing(&mut self, config: &IndexerConfig) -> Result<()> {
        // Create gRPC client with TLS configuration
        let tls_config = ClientTlsConfig::new().with_native_roots();
        let mut client_builder = GeyserGrpcClient::build_from_shared(config.grpc_endpoint.clone())?
            .tls_config(tls_config)?;
        
        if let Some(token) = &config.x_token {
            client_builder = client_builder.x_token(Some(token.clone()))?;
        }

        let mut client = match client_builder.connect().await {
            Ok(client) => {
                info!("Successfully connected to gRPC server!");
                client
            }
            Err(e) => {
                error!("Failed to connect to gRPC server: {}", e);
                info!("Will retry connection every 30 seconds...");
                
                // Keep trying to reconnect
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
                    info!("Retrying gRPC connection...");
                    
                    let retry_tls_config = ClientTlsConfig::new().with_native_roots();
                    let mut retry_builder = GeyserGrpcClient::build_from_shared(config.grpc_endpoint.clone())?
                        .tls_config(retry_tls_config)?;
                    
                    if let Some(token) = &config.x_token {
                        retry_builder = retry_builder.x_token(Some(token.clone()))?;
                    }
                    
                    match retry_builder.connect().await {
                        Ok(client) => {
                            info!("Successfully reconnected to gRPC server!");
                            break client;
                        }
                        Err(e) => {
                            warn!("Reconnection failed: {}, retrying in 30s...", e);
                            continue;
                        }
                    }
                }
            }
        };

        // Create initial subscription request
        let request = self.create_subscription_request(&config.commitment_level).await?;
        
        let (_subscribe_tx, mut stream) = client.subscribe_with_request(Some(request)).await?;

        info!("Started account indexing stream");

        // Process incoming messages
        let mut message_count = 0;
        while let Some(message) = stream.next().await {
            match message {
                Ok(msg) => {
                    message_count += 1;
                    if message_count % 100 == 1 {
                        info!("Received {} messages so far...", message_count);
                    }
                    
                    match &msg.update_oneof {
                        Some(UpdateOneof::Account(account_update)) => {
                            info!("Processing account update for slot {}", account_update.slot);
                            if let Err(e) = self.process_account_update(account_update.clone()).await {
                                error!("Failed to process account update: {}", e);
                            }
                        }
                        Some(other) => {
                            if message_count <= 10 {
                                info!("Received other message type: {:?}", std::mem::discriminant(other));
                            }
                        }
                        None => {
                            if message_count <= 10 {
                                info!("Received message with no update");
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Stream error: {}", e);
                    // In production, you might want to implement reconnection logic here
                    break;
                }
            }
        }

        warn!("Indexing stream ended");
        Ok(())
    }

    /// Add a new user pubkey to be indexed
    pub async fn add_user_pubkey(&self, pubkey: String) -> Result<()> {
        // Check if user exists in database
        let exists = self.store.user_exists_by_pubkey(&pubkey).await
            .context("Failed to check if user exists")?;
        
        if !exists {
            info!("User with pubkey {} not found in database, skipping", pubkey);
            return Ok(());
        }

        // Add to in-memory tracking list
        let mut accounts = self.user_accounts.lock().await;
        if !accounts.contains(&pubkey) {
            accounts.push(pubkey.clone());
        }

        // Note: Dynamic subscription updates require restarting the indexer
        info!("Added user pubkey: {} (restart indexer to include in subscription)", pubkey);

        Ok(())
    }

    /// Remove a user pubkey from indexing
    pub async fn remove_user_pubkey(&self, pubkey: &str) -> Result<()> {
        let mut accounts = self.user_accounts.lock().await;
        accounts.retain(|addr| addr != pubkey);

        // Note: Dynamic subscription updates require restarting the indexer
        info!("Removed user pubkey: {} (restart indexer to update subscription)", pubkey);

        Ok(())
    }

    /// Get current list of tracked user accounts
    pub async fn get_tracked_accounts(&self) -> Vec<String> {
        self.user_accounts.lock().await.clone()
    }

    /// Process an account update message - update balance for SOL or SPL tokens
    async fn process_account_update(&self, account_update: SubscribeUpdateAccount) -> Result<()> {
        let account_info = account_update.account
            .ok_or_else(|| anyhow::anyhow!("Missing account info in update"))?;

        // Decode pubkey and owner from bytes to base58 strings
        let pubkey = bs58::encode(&account_info.pubkey).into_string();
        let owner = bs58::encode(&account_info.owner).into_string();
        
        info!("Account update: {} (owner: {}, lamports: {})", pubkey, owner, account_info.lamports);

        // Determine if this is a SOL account or SPL token account
        if owner == "11111111111111111111111111111111" {
            // This is a SOL account (owned by System Program)
            info!("Attempting to update SOL balance for {} (lamports: {})", pubkey, account_info.lamports);
            match self.store.update_user_sol_balance(&pubkey, account_info.lamports).await {
                Ok(_) => {
                    info!("Updated SOL balance for {} at slot {} (lamports: {})", pubkey, account_update.slot, account_info.lamports);
                }
                Err(e) => {
                    error!("Failed to update SOL balance for {}: {}", pubkey, e);
                }
            }
        } else if owner == "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" {
            // This is an SPL Token account (owned by Token Program)
            if let Some((mint_address, amount)) = self.parse_spl_token_account(&account_info.data) {
                self.store.update_balance_by_mint(&pubkey, &mint_address, amount).await
                    .context("Failed to update token balance")?;
                
                info!(
                    "Updated token balance for {} (mint: {}) at slot {} (amount: {})",
                    pubkey, mint_address, account_update.slot, amount
                );
            } else {
                warn!("Failed to parse SPL token account data for {}", pubkey);
            }
        } else {
            // Other account types - skip for now
            return Ok(());
        }

        Ok(())
    }

    /// Parse SPL Token account data to extract mint address and amount
    fn parse_spl_token_account(&self, data: &[u8]) -> Option<(String, u64)> {
        // SPL Token Account structure:
        // - mint: [u8; 32] (bytes 0-31)
        // - owner: [u8; 32] (bytes 32-63)  
        // - amount: u64 (bytes 64-71)
        // - delegate: Option<[u8; 32]> (bytes 72-103)
        // - state: u8 (byte 104)
        // - is_native: Option<u64> (bytes 105-112)
        // - delegated_amount: u64 (bytes 113-120)
        // - close_authority: Option<[u8; 32]> (bytes 121-152)
        
        if data.len() < 72 {
            return None;
        }

        // Extract mint address (first 32 bytes)
        let mint_bytes = &data[0..32];
        let mint_address = bs58::encode(mint_bytes).into_string();
        
        // Extract amount (bytes 64-71, little-endian u64)
        let amount_bytes = &data[64..72];
        let amount = u64::from_le_bytes(amount_bytes.try_into().ok()?);
        
        Some((mint_address, amount))
    }

    /// Create subscription request with current user accounts
    async fn create_subscription_request(&self, commitment: &CommitmentLevel) -> Result<SubscribeRequest> {
        let accounts = self.user_accounts.lock().await;
        
        let mut accounts_filter = HashMap::new();
        
        if !accounts.is_empty() {
            accounts_filter.insert(
                "user_accounts".to_owned(),
                SubscribeRequestFilterAccounts {
                    account: accounts.clone(),
                    owner: vec![], // Can add program owners here if needed
                    filters: vec![], // Can add additional filters (datasize, memcmp, etc.)
                    nonempty_txn_signature: None,
                },
            );
        }

        Ok(SubscribeRequest {
            accounts: accounts_filter,
            slots: HashMap::new(),
            transactions: HashMap::new(),
            transactions_status: HashMap::new(),
            entry: HashMap::new(),
            blocks: HashMap::new(),
            blocks_meta: HashMap::new(),
            commitment: Some(*commitment as i32),
            accounts_data_slice: vec![],
            ping: None,
            from_slot: None,
        })
    }

    /// Check if a user exists by pubkey
    pub async fn user_exists(&self, pubkey: &str) -> Result<bool> {
        self.store.user_exists_by_pubkey(pubkey).await
            .context("Failed to check if user exists")
    }

    /// Get current SOL balance for a pubkey
    pub async fn get_user_sol_balance(&self, pubkey: &str) -> Result<Option<u64>> {
        self.store.get_user_balance(pubkey).await
            .context("Failed to get user SOL balance")
    }

    /// Update balance for any asset by mint address
    pub async fn update_asset_balance(&self, pubkey: &str, mint_address: &str, amount: u64) -> Result<()> {
        self.store.update_balance_by_mint(pubkey, mint_address, amount).await
            .context("Failed to update asset balance")
    }

    /// Bulk add multiple user pubkeys
    pub async fn add_multiple_users(&self, pubkeys: Vec<String>) -> Result<()> {
        for pubkey in pubkeys {
            if let Err(e) = self.add_user_pubkey(pubkey.clone()).await {
                error!("Failed to add user pubkey {}: {}", pubkey, e);
            }
        }
        Ok(())
    }

}

// Example usage and helper functions
impl AccountIndexer {
    /// Example method to simulate user signup
    pub async fn simulate_user_signup(&self, pubkey: String) -> Result<()> {
        info!("New user signup detected: {}", pubkey);
        self.add_user_pubkey(pubkey).await
    }

    /// Get indexer statistics
    pub async fn get_stats(&self) -> IndexerStats {
        let tracked_accounts = self.get_tracked_accounts().await;
        
        IndexerStats {
            tracked_accounts_count: tracked_accounts.len(),
            tracked_accounts: tracked_accounts,
        }
    }

    /// Example: Create a test user with all assets
    pub async fn create_test_user(&self, email: &str, password: &str, pubkey: &str) -> Result<()> {
        use store::user::CreateUserRequest;

        let request = CreateUserRequest {
            id: Uuid::new_v4().to_string(),
            email: email.to_string(),
            password: password.to_string(),
            pubkey: pubkey.to_string(),
        };

        let user = self.store.create_user(request).await
            .context("Failed to create test user")?;
        
        info!("Created test user: {} with pubkey: {}", user.email, user.public_key);

        // Get user balances to show they were initialized
        let balances = self.store.get_user_balances(&user.id).await
            .context("Failed to get user balances")?;
        
        info!("User {} has {} asset balances:", user.email, balances.len());
        for balance in balances {
            info!("  {}: {} ({})", balance.asset_symbol, balance.amount, balance.asset_name);
        }

        Ok(())
    }
}

#[derive(Debug, serde::Serialize)]
pub struct IndexerStats {
    pub tracked_accounts_count: usize,
    pub tracked_accounts: Vec<String>,
}