use anchor_lang::prelude::*;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

declare_id!("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");

#[program]
pub mod zkl_last_2 {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.username = *ctx.accounts.user.key;
        user_account.received_files = Vec::new();
        Ok(())
    }

    pub fn send_file_hash(
        ctx: Context<SendFileHash>,
        file_hash: String,
        signed_hash: String,
    ) -> Result<()> {
        let sender = &ctx.accounts.sender;
        let recipient = &mut ctx.accounts.recipient;

        let file_info = FileInfo {
            hash: file_hash,
            signed_hash,
            sender: *sender.key,
            is_verified: false,
        };

        recipient.received_files.push(file_info);
        Ok(())
    }

    pub fn verify_file_hash(ctx: Context<VerifyFileHash>, file_hash: String) -> Result<()> {
        let recipient = &mut ctx.accounts.recipient;

        if let Some(file_info) = recipient
            .received_files
            .iter_mut()
            .find(|f| f.hash == file_hash)
        {
            // Verify the MAC
            let key = ctx.accounts.signer.key().to_bytes();
            let verified = verify_mac(&file_info.hash, &file_info.signed_hash, &key);
            file_info.is_verified = verified;

            if verified {
                msg!("File hash verified successfully");
                Ok(())
            } else {
                Err(ProgramError::InvalidSignature.into())
            }
        } else {
            Err(ProgramError::InvalidAccountData.into())
        }
    }

    pub fn sign_file_hash(ctx: Context<SignFileHash>, file_hash: String) -> Result<String> {
        let key = ctx.accounts.signer.key().to_bytes();
        let signed_hash = compute_mac(&file_hash, &key);
        Ok(signed_hash)
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1000)] // Increased space for more files
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendFileHash<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct VerifyFileHash<'info> {
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SignFileHash<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[account]
pub struct UserAccount {
    pub username: Pubkey,
    pub received_files: Vec<FileInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FileInfo {
    pub hash: String,
    pub signed_hash: String,
    pub sender: Pubkey,
    pub is_verified: bool,
}

// Helper function to compute MAC
fn compute_mac(message: &str, key: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(message.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

// Helper function to verify MAC
fn verify_mac(message: &str, signed_hash: &str, key: &[u8]) -> bool {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(message.as_bytes());

    let decoded_signed_hash = hex::decode(signed_hash).expect("Decoding failed");
    mac.verify_slice(&decoded_signed_hash).is_ok()
}
