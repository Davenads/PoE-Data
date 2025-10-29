import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import type { Command } from './src/models/command.interface';

// Load environment variables
dotenv.config();

/**
 * Dynamically load all command files from the commands directory
 */
async function loadCommands(): Promise<Command[]> {
  const commands: Command[] = [];
  const commandsPath = join(__dirname, 'src', 'commands');

  try {
    const commandFiles = readdirSync(commandsPath).filter(file => {
      // Load .ts files in development or .js files in production
      return (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'index.ts' && file !== 'index.js';
    });

    console.log(`📂 Found ${commandFiles.length} command files in ${commandsPath}`);

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);

      try {
        // Dynamic import (works with both TS and JS)
        const commandModule = await import(filePath);
        const command = commandModule.default;

        if (command && command.data && command.execute) {
          commands.push(command);
          console.log(`   ✓ Loaded: ${file} (/${command.data.name})`);
        } else {
          console.warn(`   ⚠️  Skipped: ${file} (missing data or execute)`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to load: ${file}`, error);
      }
    }

    return commands;
  } catch (error) {
    console.error('❌ Error reading commands directory:', error);
    throw error;
  }
}

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
    // Dynamically load all commands
    console.log('🔍 Loading commands...\n');
    const commands = await loadCommands();

    if (commands.length === 0) {
      console.error('❌ No valid commands found to deploy');
      process.exit(1);
    }

    // Get command data for deployment
    const commandData = commands.map(cmd => cmd.data.toJSON());

    console.log(`\n🚀 Starting deployment of ${commands.length} application (/) commands...\n`);

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
