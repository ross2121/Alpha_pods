// This file contains legacy client structures that are now superseded by the new indexer.rs
// Keeping for reference but the main functionality is in indexer.rs

use std::collections::HashMap;
use yellowstone_grpc_proto::prelude::{CommitmentLevel, SubscribeRequest, SubscribeRequestFilterAccounts};

/// Legacy client configuration - use IndexerConfig in indexer.rs instead
#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub endpoint: String,
    pub x_token: Option<String>,
    pub commitment: CommitmentLevel,
}

/// Helper function to create a simple account subscription request
pub fn create_simple_account_request(
    account_addresses: Vec<String>, 
    commitment: CommitmentLevel
) -> SubscribeRequest {
    let mut accounts_filter = HashMap::new();
    
    if !account_addresses.is_empty() {
        accounts_filter.insert(
            "accounts".to_owned(),
            SubscribeRequestFilterAccounts {
                account: account_addresses,
                owner: vec![],
                filters: vec![],
                nonempty_txn_signature: None,
            },
        );
    }

    SubscribeRequest {
        accounts: accounts_filter,
        slots: HashMap::new(),
        transactions: HashMap::new(),
        transactions_status: HashMap::new(),
        entry: HashMap::new(),
        blocks: HashMap::new(),
        blocks_meta: HashMap::new(),
        commitment: Some(commitment as i32),
        accounts_data_slice: vec![],
        ping: None,
        from_slot: None,
    }
}