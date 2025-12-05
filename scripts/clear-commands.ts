import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function clearCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildIdTest = process.env.DISCORD_GUILD_ID_TEST;
  const guildIdProd = process.env.DISCORD_GUILD_ID_PROD;

  if (!token || !clientId) {
    console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env file');
    process.exit(1);
  }

  const rest = new REST().setToken(token);

  try {
    // Smart clearing: use PROD if set, fallback to TEST
    let guildId: string | undefined;
    let envName: string;

    if (guildIdProd) {
      guildId = guildIdProd;
      envName = 'PRODUCTION';
      console.log('✓ Production server ID found - clearing PRODUCTION commands');
    } else if (guildIdTest) {
      guildId = guildIdTest;
      envName = 'TEST';
      console.log('⚠️  Production server ID not set - clearing TEST server commands');
    } else {
      console.error('❌ Missing both DISCORD_GUILD_ID_PROD and DISCORD_GUILD_ID_TEST in .env file');
      console.log('ℹ️  Please set at least DISCORD_GUILD_ID_TEST in your .env file');
      process.exit(1);
    }

    console.log(`🗑️  Clearing ${envName} server commands (${guildId})...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log(`✅ Successfully cleared all ${envName} server commands`)

    console.log('\n💡 Run "npm run deploy-commands" to redeploy commands');
  } catch (error) {
    console.error('❌ Error clearing commands:', error);
    process.exit(1);
  }
}

clearCommands();
