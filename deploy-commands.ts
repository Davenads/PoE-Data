import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import commands
import priceCommand from './src/commands/price';
import helpCommand from './src/commands/help';
import compareCommand from './src/commands/compare';
import moversCommand from './src/commands/movers';
import searchCommand from './src/commands/search';
import leagueCommand from './src/commands/league';
import trendsCommand from './src/commands/trends';
import chartCommand from './src/commands/chart';

const commands = [
  priceCommand,
  helpCommand,
  compareCommand,
  moversCommand,
  searchCommand,
  leagueCommand,
  trendsCommand,
  chartCommand
];

// Get command data
const commandData = commands.map(cmd => cmd.data.toJSON());

async function deployCommands() {
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
    console.log(`🚀 Started deploying ${commands.length} application (/) commands...`);

    // Smart deployment: use PROD if set, fallback to TEST
    let guildId: string | undefined;
    let envName: string;

    if (guildIdProd) {
      guildId = guildIdProd;
      envName = 'PRODUCTION';
      console.log('✓ Production server ID found - deploying to PRODUCTION');
    } else if (guildIdTest) {
      guildId = guildIdTest;
      envName = 'TEST';
      console.log('⚠️  Production server ID not set - deploying to TEST server');
    } else {
      console.error('❌ Missing both DISCORD_GUILD_ID_PROD and DISCORD_GUILD_ID_TEST in .env file');
      console.log('ℹ️  Please set at least DISCORD_GUILD_ID_TEST in your .env file');
      process.exit(1);
    }

    console.log(`📡 Deploying commands to ${envName} server (${guildId})...`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commandData }
    );

    console.log(`✅ Successfully deployed commands to ${envName} server`)

    console.log('\n📋 Deployed Commands:');
    commands.forEach(cmd => {
      console.log(`   • /${cmd.data.name} - ${cmd.data.description}`);
    });

    console.log('\n✨ Deployment complete!');

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
