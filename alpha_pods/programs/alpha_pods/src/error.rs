use anchor_lang::prelude::*;

#[error_code]
pub enum alpha_error{
    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,
    
    #[msg("Member not found in escrow")]
    MemberNotFound,
    
    #[msg("Only admin can perform this action")]
    UnauthorizedAdmin,
    
    #[msg("Only members can perform this action")]
    UnauthorizedMember,
    
    #[msg("Member already exists in escrow")]
    MemberAlreadyExists,
    
    #[msg("Cannot remove member with active balance")]
    MemberHasBalance,
    
    #[msg("Threshold cannot be zero")]
    InvalidThreshold,
    
    #[msg("Too many members - maximum is 50")]
    TooManyMembers,
    
    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,
    
    #[msg("Invalid withdrawal amount")]
    InvalidWithdrawalAmount,
    
    #[msg("Transfer failed")]
    TransferFailed,
    
    #[msg("Account initialization failed")]
    InitializationFailed,
    
    #[msg("Seeds constraint violation")]
    SeedsConstraintViolated,
    
    #[msg("Account not found")]
    AccountNotFound,
    
    #[msg("Insufficient funds in escrow")]
    InsufficientEscrowFunds,
    
    #[msg("Member balance is zero")]
    ZeroBalance,
    
    #[msg("Invalid member address")]
    InvalidMemberAddress,
    
    #[msg("Admin cannot be a member")]
    AdminCannotBeMember,
    
    #[msg("Duplicate member addresses not allowed")]
    DuplicateMemberAddress,
    
    #[msg("Escrow is not initialized")]
    EscrowNotInitialized,
    
    #[msg("Invalid escrow state")]
    InvalidEscrowState,
}
