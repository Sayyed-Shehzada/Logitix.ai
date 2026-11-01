import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Wifi,
  Radio,
  FileCode2,
  Copy,
  Check,
  Send,
  Eye,
  ShieldCheck,
  Power,
  Gauge,
  Thermometer,
  Droplets,
  Ruler,
  Compass,
  Lightbulb,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface HardwareTwinViewProps {
  darkMode?: boolean;
  onInjectCodeToChat?: (code: string) => void;
}

interface CircuitComponent {
  id: string;
  name: string;
  type: 'oled' | 'dht22' | 'ultrasonic' | 'servo' | 'relay' | 'neopixel' | 'pir';
  pins: { pin: string; target: string; color: string }[];
  state: any;
}

const PRESET_CIRCUITS = [
  {
    id: 'weather_station',
    title: 'ESP32 Smart Weather Station with OLED & DHT22',
    board: 'ESP32-WROOM-32',
    description: 'Reads ambient temperature and relative humidity via DHT22 and renders a telemetry dashboard on the SSD1306 OLED display with WiFi sync.',
    firmware: `// ESP32 Smart Environmental Telemetry Node
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void setup() {
  Serial.begin(115200);
  dht.begin();
  Wire.begin(21, 22); // SDA=GPIO21, SCL=GPIO22
  
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.println("LOGITIX ESP32 BOOT");
  display.display();
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  Serial.printf("[TELEMETRY] Temp: %.1f C | Hum: %.1f %%\\n", temp, hum);
  
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println("LOGITIX IOT TWIN");
  display.drawLine(0, 10, 128, 10, WHITE);
  
  display.setCursor(0, 18);
  display.printf("Temp: %.1f C", temp);
  display.setCursor(0, 32);
  display.printf("Humidity: %.1f %%", hum);
  display.display();
  delay(1000);
}`,
  },
  {
    id: 'radar_lock',
    title: 'Ultrasonic Radar & Servo Automated Sentry',
    board: 'Arduino Uno R3',
    description: 'Sweeps an HC-SR04 ultrasonic distance sensor with an SG90 servo motor to detect obstacles and trigger NeoPixel warnings.',
    firmware: `// Ultrasonic Distance & Servo Scanning Radar
#include <Servo.h>

#define TRIG_PIN 9
#define ECHO_PIN 10
#define SERVO_PIN 6
#define RELAY_PIN 8

Servo radarServo;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  radarServo.attach(SERVO_PIN);
}

long readDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;
}

void loop() {
  for(int pos = 0; pos <= 180; pos += 15) {
    radarServo.write(pos);
    delay(50);
    long dist = readDistanceCM();
    Serial.printf("[RADAR] Angle: %d deg | Dist: %ld cm\\n", pos, dist);
    if(dist < 20) {
      digitalWrite(RELAY_PIN, HIGH); // Alarm Trigger
    } else {
      digitalWrite(RELAY_PIN, LOW);
    }
  }
}`,
  },
];

export const HardwareTwinView: React.FC<HardwareTwinViewProps> = ({
  darkMode = false,
  onInjectCodeToChat,
}) => {
  const [selectedBoard, setSelectedBoard] = useState<'ESP32-WROOM-32' | 'Arduino Uno R3' | 'RP2040 Pico'>('ESP32-WROOM-32');
  const [activePreset, setActivePreset] = useState(PRESET_CIRCUITS[0]);
  const [firmwareCode, setFirmwareCode] = useState(PRESET_CIRCUITS[0].firmware);
  const [isRunningSim, setIsRunningSim] = useState(true);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'breadboard' | 'firmware_ide' | 'serial_terminal'>('breadboard');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Live Component Interactive Sensors State
  const [tempValue, setTempValue] = useState<number>(27.4);
  const [humValue, setHumValue] = useState<number>(58.2);
  const [distanceValue, setDistanceValue] = useState<number>(42);
  const [servoAngle, setServoAngle] = useState<number>(90);
  const [relayState, setRelayState] = useState<boolean>(false);
  const [pirMotion, setPirMotion] = useState<boolean>(false);
  const [neoColor, setNeoColor] = useState<string>('#00e5ff');

  const serialEndRef = useRef<HTMLDivElement>(null);

  // Simulation telemetry loop
  useEffect(() => {
    if (!isRunningSim) return;

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      let log = '';

      if (selectedBoard === 'ESP32-WROOM-32') {
        // Slight fluctuation
        const jitter = (Math.random() - 0.5) * 0.2;
        const currentTemp = +(tempValue + jitter).toFixed(1);
        const currentHum = +(humValue + (Math.random() - 0.5) * 0.4).toFixed(1);
        log = `[${timestamp}] [ESP32-CORE0] I2C:0x3C OK | DHT22: T=${currentTemp}°C, H=${currentHum}% | WiFi: Connected (-48dBm)`;
      } else {
        log = `[${timestamp}] [UART0] Servo Angle=${servoAngle}° | HC-SR04=${distanceValue}cm | Relay=${relayState ? 'ENGAGED' : 'IDLE'}`;
      }

      setSerialLogs((prev) => [...prev.slice(-40), log]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunningSim, selectedBoard, tempValue, humValue, distanceValue, servoAngle, relayState]);

  useEffect(() => {
    serialEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialLogs]);

  const handleSelectPreset = (preset: typeof PRESET_CIRCUITS[0]) => {
    setActivePreset(preset);
    setSelectedBoard(preset.board as any);
    setFirmwareCode(preset.firmware);
    setSerialLogs([`[SYSTEM] Flashed firmware for ${preset.title}`]);
  };

  const handleAiGenerateFirmware = () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);

    setTimeout(() => {
      const generated = `// LOGITIX AI-Synthesized Hardware Firmware
// Project: ${aiPrompt}
// Target: ${selectedBoard}

#include <Wire.h>

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT); // Status LED
  Serial.println("[LOGITIX] Initialized synthesized firmware: ${aiPrompt.replace(/"/g, '')}");
}

void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
  Serial.println("[TELEMETRY] Sensor loop operational.");
}`;
      setFirmwareCode(generated);
      setSerialLogs((prev) => [
        ...prev,
        `[AI FIRMWARE GENERATOR] Flashed custom firmware for: "${aiPrompt}"`,
        `[STATUS] Custom firmware synthesized & flashed to digital twin!`
      ]);
      setIsAiGenerating(false);
      setAiPrompt('');
    }, 1400);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 select-none max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
        darkMode ? 'glass-card-dark border-cyan-500/20 shadow-2xl' : 'glass-card-light border-cyan-200 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Hardware Digital Twin & IoT Breadboard Simulator</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Virtual Microcontroller & Circuit Sandbox
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Simulate ESP32, Arduino Uno, and RP2040 microcontrollers in real-time. Wire interactive OLEDs, DHT22 sensors, servos, and relays, write C++/MicroPython firmware, and inspect live UART telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRunningSim(!isRunningSim)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isRunningSim
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-white/10 text-slate-300 border border-white/10 hover:bg-white/20'
              }`}
            >
              <Power className={`w-4 h-4 ${isRunningSim ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{isRunningSim ? 'Simulator Online' : 'Simulator Paused'}</span>
            </button>
          </div>
        </div>

        {/* Board Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          {(['ESP32-WROOM-32', 'Arduino Uno R3', 'RP2040 Pico'] as const).map((board) => (
            <button
              key={board}
              onClick={() => setSelectedBoard(board)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                selectedBoard === board
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/10'
                  : darkMode
                  ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              ⚡ {board}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Projects & AI Firmware Generator Bar */}
      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preset Schematics & Digital Twins:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_CIRCUITS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  activePreset.id === p.id
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                    : darkMode
                    ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* AI Synthesis Prompt */}
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask AI to design a circuit & generate firmware (e.g. 'Automated plant watering when moisture < 30% with alert buzzer')..."
            className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
              darkMode ? 'bg-black/40 border-white/10 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
          <button
            onClick={handleAiGenerateFirmware}
            disabled={isAiGenerating}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiGenerating ? 'Synthesizing...' : 'Synthesize Firmware'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('breadboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'breadboard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Interactive Digital Twin Breadboard</span>
        </button>

        <button
          onClick={() => setActiveTab('firmware_ide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'firmware_ide'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Live Firmware IDE (C++ / Arduino)</span>
        </button>

        <button
          onClick={() => setActiveTab('serial_terminal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'serial_terminal'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>UART Serial Monitor (115200 Baud)</span>
        </button>
      </div>

      {/* Breadboard Virtual Canvas View */}
      {activeTab === 'breadboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Circuit Board Canvas */}
          <div className={`lg:col-span-2 p-6 rounded-3xl border relative min-h-[460px] flex flex-col justify-between overflow-hidden ${
            darkMode ? 'bg-slate-950/90 border-cyan-500/20 shadow-2xl' : 'bg-slate-900 text-white border-slate-700 shadow-xl'
          }`}>
            {/* Background PCB Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ffff08_1px,transparent_1px),linear-gradient(to_bottom,#00ffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Top PCB Header */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>ACTIVE TWIN: {selectedBoard}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                VCC: 3.3V / 5V ACTIVE
              </span>
            </div>

            {/* Center Digital Twin Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 z-10 items-center">
              {/* Virtual Microcontroller Unit */}
              <div className="p-5 rounded-2xl bg-slate-900 border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10 flex flex-col items-center justify-center space-y-3 relative group">
                <div className="w-16 h-12 rounded-lg bg-zinc-800 border border-zinc-600 flex items-center justify-center text-[10px] font-mono text-slate-300 shadow-inner">
                  {selectedBoard.includes('ESP32') ? 'ESP32 SoC' : 'ATmega328P'}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-cyan-300">{selectedBoard}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Dual-Core Tensilica Xtensa @ 240MHz</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                  <Wifi className="w-3 h-3" /> WiFi 802.11 b/g/n (Connected)
                </div>
              </div>

              {/* Virtual OLED Display 128x64 */}
              <div className="p-4 rounded-2xl bg-black border-4 border-zinc-700 shadow-2xl flex flex-col items-center justify-center">
                <div className="w-full h-32 rounded-lg bg-blue-950/80 border border-blue-500/50 p-3 font-mono text-xs text-cyan-300 flex flex-col justify-between relative overflow-hidden shadow-inner">
                  <div className="flex justify-between border-b border-cyan-500/40 pb-1 text-[10px]">
                    <span className="font-bold">LOGITIX IOT</span>
                    <span className="text-emerald-400">ONLINE</span>
                  </div>
                  <div className="space-y-1 my-auto">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>TEMP:</span>
                      <span className="text-cyan-200">{tempValue.toFixed(1)} °C</span>
                    </div>
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>HUMIDITY:</span>
                      <span className="text-cyan-200">{humValue.toFixed(1)} %</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>DIST:</span>
                      <span className="text-amber-300">{distanceValue} cm</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-cyan-400/80 text-right">SSD1306 (0x3C)</div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2">I2C OLED 128x64 (SSD1306)</span>
              </div>
            </div>

            {/* Bottom Virtual Actuators: Servo & Relay & NeoPixel */}
            <div className="grid grid-cols-3 gap-3 z-10 pt-4 border-t border-white/10">
              {/* Servo */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">SG90 Servo</span>
                <div className="w-10 h-10 mx-auto rounded-full border-2 border-cyan-400 flex items-center justify-center relative my-1">
                  <div
                    className="w-4 h-1 bg-cyan-300 absolute origin-left transition-transform duration-300"
                    style={{ transform: `rotate(${servoAngle}deg)` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-300">{servoAngle}°</span>
              </div>

              {/* Relay Switch */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">Relay Switch</span>
                <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center my-2 transition-colors ${
                  relayState ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold ${relayState ? 'text-amber-400' : 'text-slate-500'}`}>
                  {relayState ? 'CLOSED' : 'OPEN'}
                </span>
              </div>

              {/* NeoPixel RGB */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">NeoPixel RGB</span>
                <div
                  className="w-8 h-8 mx-auto rounded-full my-2 transition-all shadow-lg animate-pulse"
                  style={{ backgroundColor: neoColor, boxShadow: `0 0 16px ${neoColor}` }}
                />
                <span className="text-[10px] font-mono text-cyan-300 uppercase">{neoColor}</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Sensor Telemetry Controls */}
          <div className={`p-5 rounded-3xl border space-y-5 ${
            darkMode ? 'glass-card-dark border-white/10' : 'glass-card-light border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Live Sensor Simulation Controls
              </span>
              <span className="text-[10px] font-mono text-slate-400">Interactive</span>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Thermometer className="w-3.5 h-3.5 text-red-400" /> Temperature
                </span>
                <span className="font-mono text-cyan-300 font-bold">{tempValue.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={0.5}
                value={tempValue}
                onChange={(e) => setTempValue(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Humidity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" /> Relative Humidity
                </span>
                <span className="font-mono text-cyan-300 font-bold">{humValue.toFixed(1)} %</span>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                step={1}
                value={humValue}
                onChange={(e) => setHumValue(parseFloat(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
            </div>

            {/* Distance Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" /> Ultrasonic Distance
                </span>
                <span className="font-mono text-amber-300 font-bold">{distanceValue} cm</span>
              </div>
              <input
                type="range"
                min={2}
                max={250}
                value={distanceValue}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setDistanceValue(val);
                  if (val < 25) setRelayState(true);
                  else setRelayState(false);
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Servo Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-purple-400" /> Servo Shaft Angle
                </span>
                <span className="font-mono text-purple-300 font-bold">{servoAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                value={servoAngle}
                onChange={(e) => setServoAngle(parseInt(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Relay & Motion Toggles */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Manual Relay Trigger:</span>
                <button
                  onClick={() => setRelayState(!relayState)}
                  className="cursor-pointer text-cyan-400 hover:text-cyan-300"
                >
                  {relayState ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">NeoPixel Color:</span>
                <input
                  type="color"
                  value={neoColor}
                  onChange={(e) => setNeoColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Firmware IDE */}
      {activeTab === 'firmware_ide' && (
        <div className={`p-5 rounded-3xl border space-y-4 ${
          darkMode ? 'glass-card-dark border-white/10' : 'glass-card-light border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <FileCode2 className="w-4 h-4" />
              <span>firmware_main.ino (Target: {selectedBoard})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(firmwareCode);
                  setSerialLogs((prev) => [...prev, '[CLIPBOARD] Firmware code copied to clipboard.']);
                }}
                className="px-3 py-1.5 rounded-xl text-xs bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </button>

              {onInjectCodeToChat && (
                <button
                  onClick={() => onInjectCodeToChat(firmwareCode)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Chat</span>
                </button>
              )}
            </div>
          </div>

          <textarea
            value={firmwareCode}
            onChange={(e) => setFirmwareCode(e.target.value)}
            rows={16}
            className="w-full p-4 rounded-2xl bg-slate-950 font-mono text-xs sm:text-sm text-cyan-300 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 custom-scrollbar resize-y leading-relaxed"
          />
        </div>
      )}

      {/* Tab 3: Serial Terminal */}
      {activeTab === 'serial_terminal' && (
        <div className="p-5 rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>UART0 PORT /dev/ttyUSB0 (115200 8-N-1)</span>
            </div>
            <button
              onClick={() => setSerialLogs([])}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-white/5 cursor-pointer"
            >
              Clear Buffer
            </button>
          </div>

          <div className="h-80 overflow-y-auto custom-scrollbar font-mono text-xs space-y-1 text-slate-300 p-2">
            {serialLogs.map((log, i) => (
              <div key={i} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                <span className="text-cyan-400">{log.split(']')[0]}]</span>
                <span className="text-slate-200">{log.substring(log.indexOf(']') + 1)}</span>
              </div>
            ))}
            <div ref={serialEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
