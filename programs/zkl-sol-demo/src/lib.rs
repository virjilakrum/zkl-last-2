use anchor_lang::prelude::*;
use hex;
use hmac::{Hmac, Mac, NewMac};
use sha2::Sha256;

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

    pub fn send_encrypted_hash(
        ctx: Context<SendEncryptedHash>,
        encrypted_hash: String,
    ) -> Result<()> {
        let sender = &ctx.accounts.sender;
        let recipient = &mut ctx.accounts.recipient;

        let file_info = FileInfo {
            encrypted_hash,
            sender: *sender.key,
            is_verified: false,
        };

        recipient.received_files.push(file_info);
        Ok(())
    }

    pub fn verify_and_decrypt_hash(
        ctx: Context<VerifyAndDecryptHash>,
        encrypted_hash: String,
    ) -> Result<String> {
        let recipient = &mut ctx.accounts.recipient;
        let recipient_key = recipient.key();

        if let Some(file_info) = recipient
            .received_files
            .iter_mut()
            .find(|f| f.encrypted_hash == encrypted_hash)
        {
            let key = recipient_key.to_bytes();
            let decrypted_hash = decrypt_hash(&encrypted_hash, &key);
            file_info.is_verified = true;
            Ok(decrypted_hash)
        } else {
            Err(ProgramError::InvalidAccountData.into())
        }
    }

    pub fn encrypt_hash(ctx: Context<EncryptHash>, hash: String) -> Result<String> {
        let key = ctx.accounts.sender.key().to_bytes();
        let encrypted_hash = encrypt_hash_internal(&hash, &key);
        Ok(encrypted_hash)
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1000, seeds = [b"user_account", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendEncryptedHash<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct VerifyAndDecryptHash<'info> {
    #[account(mut)]
    pub recipient: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct EncryptHash<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
}

#[account]
pub struct UserAccount {
    pub username: Pubkey,
    pub received_files: Vec<FileInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FileInfo {
    pub encrypted_hash: String,
    pub sender: Pubkey,
    pub is_verified: bool,
}

fn encrypt_hash_internal(hash: &str, key: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(hash.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

fn decrypt_hash(encrypted_hash: &str, _key: &[u8]) -> String {
    encrypted_hash.to_string()
}
