import { Client, GatewayIntentBits, Partials } from "discord.js";
import fs from "fs";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel],
});

const CHANNEL_ID = "1436197277428482109"; // canal que cuenta
const COUNTER_FILE = "counter.json";
let counter = { total: 0, today: 0, date: "" };

// Cargar datos del contador
if (fs.existsSync(COUNTER_FILE)) {
  counter = JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
}

// Verifica si cambió el día
function checkDate() {
  const today = new Date().toISOString().split("T")[0];
  if (counter.date !== today) {
    console.log(`📅 Nuevo día detectado (${today}) → Reiniciando contador diario`);
    counter.date = today;
    counter.today = 0;
    saveCounter();
  }
}

// Guardar contador en disco
function saveCounter() {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter, null, 2));
}

// Mostrar logs cada cierto tiempo
setInterval(() => {
  checkDate();
  console.log(`[${new Date().toLocaleTimeString()}] Total: ${counter.total} | Hoy: ${counter.today}`);
}, 60 * 1000);

// Detectar todos los mensajes posibles
client.on("raw", (packet) => {
  if (packet.t !== "MESSAGE_CREATE") return;
  const data = packet.d;
  if (data.channel_id !== CHANNEL_ID) return;

  counter.total++;
  counter.today++;
  saveCounter();

  // Actualiza mensaje contador
  updateCounterMessage(data.channel_id);
});

async function updateCounterMessage(channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  // Buscar el mensaje del contador
  const messages = await channel.messages.fetch({ limit: 10 });
  const counterMsg = messages.find(msg => msg.author.id === client.user.id);

  const content = `💬 **Mensajes totales:** ${counter.total}\n📆 **Hoy:** ${counter.today}`;
  if (counterMsg) {
    await counterMsg.edit(content).catch(() => {});
  } else {
    await channel.send(content).catch(() => {});
  }
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  checkDate();
  updateCounterMessage(CHANNEL_ID);
});

client.login(process.env.TOKEN);
