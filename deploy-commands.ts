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
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env file');
    process.exit(1);
  }

  const rest = new REST().setToken(token);

  try {
    console.log(`🚀 Started deploying ${commands.length} application (/) commands...`);

    // Check if production mode
    const isProduction = process.argv.includes('--production');

    if (isProduction) {
      // Deploy globally (takes ~1 hour to propagate)
      console.log('📡 Deploying commands globally (this may take up to 1 hour)...');

      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandData }
      );

      console.log('✅ Successfully deployed commands globally');
    } else {
      // Deploy to guild (instant updates)
      if (!guildId) {
        console.error('❌ Missing DISCORD_GUILD_ID in .env file for guild deployment');
        console.log('ℹ️  Use --production flag to deploy globally instead');
        process.exit(1);
      }

      console.log(`📡 Deploying commands to guild ${guildId}...`);

      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData }
      );

      console.log('✅ Successfully deployed commands to guild');
    }

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
