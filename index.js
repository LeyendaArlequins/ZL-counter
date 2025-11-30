// === IMPORTS ===
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

// === CONFIGURACIÓN ===
const TOKEN = process.env.TOKEN; // Token desde Railway (secreto)
const API_URL = process.env.API_URL; // API desde secreto
const NOTIFICATION_CHANNEL_ID = "1443332719869431828"; // Canal donde enviar las notificaciones
const CHECK_INTERVAL = 30000; // Revisar cada 30 segundos

// === VARIABLES ===
let lastProcessedServers = new Set();
let isChecking = false;

// === CLIENTE DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// === EVENTO READY ===
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  startAPIChecker();
  console.log("🟢 Monitor de API activo");
});

// === MONITOR DE API ===
async function startAPIChecker() {
  setInterval(async () => {
    if (isChecking) return;
    await checkAPI();
  }, CHECK_INTERVAL);
}

async function checkAPI() {
  try {
    isChecking = true;
    
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (!data.success || !data.activeServers) {
      console.log("❌ API no disponible o sin servidores activos");
      return;
    }

    await processNewServers(data.activeServers);
    
  } catch (error) {
    console.error("⚠️ Error al consultar API:", error.message);
  } finally {
    isChecking = false;
  }
}

async function processNewServers(servers) {
  for (const server of servers) {
    const serverId = server.gameInstanceId;
    
    // Evitar procesar el mismo servidor múltiples veces
    if (lastProcessedServers.has(serverId)) {
      continue;
    }
    
    console.log(`🆕 Nuevo servidor detectado: ${serverId}`);
    lastProcessedServers.add(serverId);
    await sendNotification(server);
    
    // Limitar el cache para evitar memory leaks
    if (lastProcessedServers.size > 50) {
      const first = Array.from(lastProcessedServers)[0];
      lastProcessedServers.delete(first);
    }
  }
}

async function sendNotification(server) {
  try {
    const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
    if (!channel) {
      console.error("❌ Canal de notificación no encontrado");
      return;
    }

    const { animalData, gameInstanceId, placeId } = server;
    
    // Formatear el dinero por segundo
    const value = animalData.value || 0;
    let moneyPerSecFormatted;
    
    if (value >= 1000000000) {
      moneyPerSecFormatted = `💰 ${(value / 1000000000).toFixed(1)}B/s`;
    } else if (value >= 1000000) {
      moneyPerSecFormatted = `💰 ${(value / 1000000).toFixed(1)}M/s`;
    } else if (value >= 1000) {
      moneyPerSecFormatted = `💰 ${(value / 1000).toFixed(1)}K/s`;
    } else {
      moneyPerSecFormatted = `💰 ${value}/s`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🐾 **Zl | Finder**")
      .setColor(0x00FF00)
      .addFields(
        {
          name: "**Name**",
          value: animalData.displayName || "N/A",
          inline: false
        },
        {
          name: "**Money per sec**",
          value: moneyPerSecFormatted,
          inline: true
        },
        {
          name: "**Generation**",
          value: `📊 ${animalData.generation || "N/A"}`,
          inline: true
        },
        {
          name: "**Rarity**",
          value: `🌟 ${animalData.rarity || "N/A"}`,
          inline: true
        },
        {
          name: "**Job ID**",
          value: `\`\`\`${gameInstanceId}\`\`\``,
          inline: false
        },
        {
          name: "**Join Link**",
          value: `[Click to Join](https://chillihub1.github.io/chillihub-joiner/?placeId=${placeId}&gameInstanceId=${gameInstanceId})`,
          inline: false
        },
        {
          name: "**Join Script (PC)**",
          value: `\`\`\`lua\ngame:GetService("TeleportService"):TeleportToPlaceInstance(${placeId},"${gameInstanceId}",game.Players.LocalPlayer)\n\`\`\``,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `made by zl hub • ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`,
      });

    await channel.send({
      embeds: [embed],
      username: "Zl Notifier",
      avatarURL: "https://cdn.discordapp.com/attachments/1128833213672656988/1215321493282160730/standard_1.gif"
    });

    console.log(`📨 Notificación enviada para: ${animalData.displayName}`);

  } catch (error) {
    console.error("⚠️ Error al enviar notificación:", error);
  }
}

// === ERRORES ===
client.on("error", console.error);
process.on("unhandledRejection", console.error);

// === LOGIN ===
client.login(TOKEN);
