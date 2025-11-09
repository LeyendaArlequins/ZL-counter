// === IMPORTS ===
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import fs from "fs";

// === CONFIGURACIÓN ===
const TOKEN = process.env.TOKEN; // Token desde Railway (secreto)
const TARGET_CHANNEL_ID = "1436197277428482109"; // Canal donde contar mensajes
const EMBED_CHANNEL_ID = "1437108848254124052"; // Canal donde enviar el embed
const RESET_TIME = 24 * 60 * 60 * 1000; // 24 horas

// === VARIABLES ===
let messageCount = 0;
let embedMessageId = null;

// === CLIENTE DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// === EVENTO READY ===
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  await initializeEmbed();
  scheduleDailyReset();
  console.log("🟢 Contador activo y escuchando TODOS los mensajes");
});

// === CAPTURAR TODOS LOS MENSAJES (INCLUYE BOTS Y WEBHOOKS) ===
client.on("raw", async (packet) => {
  if (packet.t !== "MESSAGE_CREATE") return;

  const data = packet.d;
  if (data.channel_id !== TARGET_CHANNEL_ID) return;

  messageCount++;

  const authorTag = data.author?.username
    ? `${data.author.username}#${data.author.discriminator}`
    : "Webhook/Embed";

  console.log(`📨 Mensaje contado (${messageCount}) - Autor: ${authorTag}`);
  await updateEmbed();
});

// === FUNCIONES PRINCIPALES ===
async function initializeEmbed() {
  try {
    const embedChannel = client.channels.cache.get(EMBED_CHANNEL_ID);
    if (!embedChannel) {
      console.error("❌ Canal de embed no encontrado");
      return;
    }

    const messages = await embedChannel.messages.fetch({ limit: 20 });
    const botEmbed = messages.find(
      (msg) =>
        msg.author.id === client.user.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title === "Ejecuciones hoy"
    );

    if (botEmbed) {
      embedMessageId = botEmbed.id;
      console.log("📌 Embed existente encontrado:", embedMessageId);
      await updateEmbed();
    } else {
      await sendNewEmbed();
      console.log("🆕 Nuevo embed creado");
    }
  } catch (error) {
    console.error("⚠️ Error al inicializar embed:", error);
  }
}

async function sendNewEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("Ejecuciones hoy")
    .setColor(0x00ff00)
    .setDescription(
      `**Número de ejecuciones:**\n\`\`\`py\n${messageCount}\n\`\`\``
    )
    .setTimestamp()
    .setFooter({ text: "Contador se reinicia cada 24 horas" });

  try {
    const embedChannel = client.channels.cache.get(EMBED_CHANNEL_ID);
    if (!embedChannel) return;

    const sentMessage = await embedChannel.send({ embeds: [embed] });
    embedMessageId = sentMessage.id;
    console.log("📨 Embed enviado con ID:", embedMessageId);
  } catch (error) {
    console.error("⚠️ Error al enviar nuevo embed:", error);
  }
}

async function updateEmbed() {
  if (!embedMessageId) {
    console.log("⚠️ No hay embed, creando uno nuevo...");
    await sendNewEmbed();
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Ejecuciones hoy")
    .setColor(0x00ff00)
    .setDescription(
      `**Número de ejecuciones:**\n\`\`\`py\n${messageCount}\n\`\`\``
    )
    .setTimestamp()
    .setFooter({ text: "Contador se reinicia cada 24 horas" });

  try {
    const embedChannel = client.channels.cache.get(EMBED_CHANNEL_ID);
    if (!embedChannel) {
      console.error("❌ Canal de embed no encontrado");
      return;
    }

    const messageToEdit = await embedChannel.messages.fetch(embedMessageId);
    await messageToEdit.edit({ embeds: [embed] });
    console.log(`🔢 Embed actualizado: ${messageCount} mensajes`);
  } catch (error) {
    if (error.code === 10008) {
      console.log("🗑️ El embed fue eliminado, creando uno nuevo...");
      embedMessageId = null;
      await sendNewEmbed();
    } else {
      console.error("⚠️ Error al actualizar embed:", error);
    }
  }
}

// === PROGRAMAR RESET DIARIO ===
function scheduleDailyReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const timeUntilMidnight = midnight - now;

  setTimeout(() => {
    resetCounter();
    setInterval(resetCounter, RESET_TIME);
  }, timeUntilMidnight);

  console.log(
    `🕒 Reset programado en ${(timeUntilMidnight / 1000 / 60).toFixed(1)} minutos`
  );
}

// === REINICIAR CONTADOR Y GUARDAR LOG ===
function resetCounter() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  saveDailyLog(dateStr, messageCount);
  messageCount = 0;
  console.log("🔄 Contador reiniciado");
  updateEmbed();
}

// === GUARDAR REGISTRO EN ARCHIVO ===
function saveDailyLog(dateStr, count) {
  const logFile = "registro.txt";
  const logLine = `Día ${dateStr} = ${count}\n`;

  fs.appendFileSync(logFile, logLine);
  console.log(`🗓️ Guardado en registro.txt → ${logLine.trim()}`);
}

// === ERRORES ===
client.on("error", console.error);
process.on("unhandledRejection", console.error);

// === LOGIN ===
client.login(TOKEN);
