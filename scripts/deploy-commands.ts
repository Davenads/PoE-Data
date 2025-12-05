import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import type { Command } from '../src/models/command.interface';

// Load environment variables
dotenv.config();

/**
 * Dynamically load all command files from the commands directory
 */
async function loadCommands(): Promise<Command[]> {
  const commands: Command[] = [];
  const commandsPath = join(__dirname, '..', 'src', 'commands');

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

  if (!guildIdTest && !guildIdProd) {
    console.error('❌ Missing both DISCORD_GUILD_ID_TEST and DISCORD_GUILD_ID_PROD in .env file');
    console.log('ℹ️  Please set at least DISCORD_GUILD_ID_TEST in your .env file');
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

    // Deploy to both test and prod servers
    const deployments: Array<{ guildId: string; name: string }> = [];

    // Parse comma-separated test guild IDs
    if (guildIdTest) {
      const testGuildIds = guildIdTest.split(',').map(id => id.trim()).filter(Boolean);
      testGuildIds.forEach((guildId, index) => {
        const serverLabel = testGuildIds.length > 1 ? `TEST ${index + 1}` : 'TEST';
        deployments.push({ guildId, name: serverLabel });
      });
    }

    if (guildIdProd) {
      deployments.push({ guildId: guildIdProd, name: 'PRODUCTION' });
    }

    const results: Array<{ name: string; success: boolean; error?: any }> = [];

    for (const deployment of deployments) {
      console.log(`📡 Deploying to ${deployment.name} server (${deployment.guildId})...`);

      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, deployment.guildId),
          { body: commandData }
        );

        console.log(`✅ Successfully deployed to ${deployment.name} server\n`);
        results.push({ name: deployment.name, success: true });

      } catch (error: any) {
        // Graceful fallback - don't fail if bot isn't in the server yet
        if (error.code === 50001 || error.code === 10004) {
          console.log(`⚠️  Bot not in ${deployment.name} server yet - skipping deployment`);
          console.log(`   (This is normal if bot hasn't been invited to ${deployment.name} yet)\n`);
          results.push({ name: deployment.name, success: false, error: 'Bot not in server' });
        } else {
          console.error(`❌ Failed to deploy to ${deployment.name} server:`, error.message);
          results.push({ name: deployment.name, success: false, error: error.message });
        }
      }
    }

    // Summary
    console.log('\n📋 Deployed Commands:');
    commands.forEach(cmd => {
      console.log(`   • /${cmd.data.name} - ${cmd.data.description}`);
    });

    console.log('\n📊 Deployment Summary:');
    results.forEach(result => {
      if (result.success) {
        console.log(`   ✅ ${result.name}: Deployed successfully`);
      } else {
        console.log(`   ⚠️  ${result.name}: ${result.error}`);
      }
    });

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      console.log(`\n✨ Deployment complete! (${successCount}/${results.length} servers)`);
    } else {
      console.log('\n⚠️  No deployments succeeded. Please check bot permissions and server IDs.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
