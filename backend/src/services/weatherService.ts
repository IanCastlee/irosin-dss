// Weather & Storm Advisory Service for Sorsogon Municipalities
export const SORSOGON_LOCATIONS: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  irosin: { name: "Irosin", province: "Sorsogon", lat: 12.7042, lng: 124.0371 },
  bulusan: { name: "Bulusan", province: "Sorsogon", lat: 12.7512, lng: 124.1324 },
  juban: { name: "Juban", province: "Sorsogon", lat: 12.8485, lng: 123.9961 },
  casiguran: { name: "Casiguran", province: "Sorsogon", lat: 12.8715, lng: 124.0094 },
  bulan: { name: "Bulan", province: "Sorsogon", lat: 12.6698, lng: 123.8758 },
  gubat: { name: "Gubat", province: "Sorsogon", lat: 12.9189, lng: 124.1242 },
  sorsogon_city: { name: "Sorsogon City", province: "Sorsogon", lat: 12.9742, lng: 124.0058 },
  matnog: { name: "Matnog", province: "Sorsogon", lat: 12.5852, lng: 124.0847 },
};

interface CachedWeatherData {
  data: any;
  cachedAt: number;
}

const locationCache = new Map<string, CachedWeatherData>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

const weatherCodeMap: Record<number, { tl: string; en: string; icon: string; severity: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL' }> = {
  0: { tl: "Maliwalas", en: "Clear Sky", icon: "sunny-outline", severity: "NORMAL" },
  1: { tl: "Maaliwalas", en: "Mainly Clear", icon: "partly-sunny-outline", severity: "NORMAL" },
  2: { tl: "Bahagyang Maulap", en: "Partly Cloudy", icon: "partly-sunny-outline", severity: "NORMAL" },
  3: { tl: "Kadalasa'y Maulap", en: "Mostly Cloudy", icon: "cloud-outline", severity: "NORMAL" },
  45: { tl: "Mahamog", en: "Foggy", icon: "cloud-outline", severity: "ADVISORY" },
  48: { tl: "Makapal na Hamog", en: "Dense Fog", icon: "cloud-outline", severity: "ADVISORY" },
  51: { tl: "Mahinang Ambon", en: "Light Drizzle", icon: "rainy-outline", severity: "ADVISORY" },
  53: { tl: "Katamtamang Ambon", en: "Moderate Drizzle", icon: "rainy-outline", severity: "ADVISORY" },
  55: { tl: "Malakas na Ambon", en: "Dense Drizzle", icon: "rainy-outline", severity: "ADVISORY" },
  61: { tl: "Mahinang Ulan", en: "Light Rain", icon: "rainy-outline", severity: "ADVISORY" },
  63: { tl: "Katamtamang Ulan", en: "Moderate Rain", icon: "rainy-outline", severity: "ADVISORY" },
  65: { tl: "Malakas na Ulan", en: "Heavy Rain", icon: "thunderstorm-outline", severity: "WARNING" },
  80: { tl: "Panaka-nakang Ulan", en: "Rain Showers", icon: "rainy-outline", severity: "ADVISORY" },
  81: { tl: "Katamtamang Pag-ulan", en: "Moderate Showers", icon: "rainy-outline", severity: "WARNING" },
  82: { tl: "Malakas na Pag-ulan", en: "Heavy Showers", icon: "thunderstorm-outline", severity: "CRITICAL" },
  95: { tl: "Pagkulog at Pagkidlat", en: "Thunderstorm", icon: "thunderstorm-outline", severity: "WARNING" },
  96: { tl: "Bagyo na may Graniso", en: "Thunderstorm with Hail", icon: "thunderstorm-outline", severity: "CRITICAL" },
  99: { tl: "Matinding Bagyo", en: "Severe Thunderstorm", icon: "thunderstorm-outline", severity: "CRITICAL" },
};

export class WeatherService {
  public static async getWeather(locationKey = 'irosin', customLat?: number, customLng?: number, customName?: string): Promise<any> {
    const loc = SORSOGON_LOCATIONS[locationKey.toLowerCase()] || SORSOGON_LOCATIONS['irosin'];
    const lat = customLat || loc.lat;
    const lng = customLng || loc.lng;
    const locName = customName || loc.name;
    const cacheKey = `${lat}_${lng}`;

    const now = Date.now();
    const cached = locationCache.get(cacheKey);
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,rain,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FManila`;

      const response = await fetch(url, { headers: { 'User-Agent': 'Irosin-DSS/1.0' } });
      if (!response.ok) {
        throw new Error(`Open-Meteo API returned status ${response.status}`);
      }

      const raw: any = await response.json();
      const current = raw.current || {};
      const weatherCode = current.weather_code || 0;
      const meta = weatherCodeMap[weatherCode] || {
        tl: "Maliwalas",
        en: "Clear",
        icon: "partly-sunny-outline",
        severity: "NORMAL"
      };

      const windSpeed = current.wind_speed_10m || 0;
      const windGusts = current.wind_gusts_10m || 0;
      const pressure = current.surface_pressure || 1012;
      const precipitation = current.precipitation || 0;

      // Storm / LPA Assessment (Avoid signal terms for regular weather)
      let hasActiveThreat = false;
      let threatCategory: 'TYPHOON' | 'TROPICAL_STORM' | 'LOW_PRESSURE_AREA' | 'HEAVY_RAINFALL' | 'NONE' = 'NONE';
      let advisoryLevel: 'NONE' | 'YELLOW' | 'ORANGE' | 'RED' = 'NONE';
      let threatTitle = `Panahon sa ${locName}: ${meta.en}`;
      let threatDesc = `Walang aktibong banta ng masamang panahon sa ${locName} sa kasalukuyan.`;
      let windSignal = 0;

      if (windSpeed >= 89 || windGusts >= 110 || pressure < 990) {
        hasActiveThreat = true;
        threatCategory = 'TYPHOON';
        advisoryLevel = 'RED';
        threatTitle = `⚠️ Babala sa Bagyo (${locName})`;
        threatDesc = `Naitatala ang malalakas na hanging aabot sa ${Math.round(windSpeed)} km/h (bugso: ${Math.round(windGusts)} km/h) at mababang pressure (${Math.round(pressure)} hPa). Lumikas sa ligtas na evacuation center.`;
      } else if (windSpeed >= 62 || windGusts >= 80 || pressure < 1000) {
        hasActiveThreat = true;
        threatCategory = 'TROPICAL_STORM';
        advisoryLevel = 'ORANGE';
        threatTitle = `⚠️ Tropical Storm Advisory (${locName})`;
        threatDesc = `May hanging may lakas na ${Math.round(windSpeed)} km/h (bugso: ${Math.round(windGusts)} km/h). Maghanda sa posibleng pagbaha at pagguho ng lupa.`;
      } else if (pressure < 1006 || precipitation >= 10 || windSpeed >= 39) {
        hasActiveThreat = true;
        threatCategory = precipitation >= 15 ? 'HEAVY_RAINFALL' : 'LOW_PRESSURE_AREA';
        advisoryLevel = 'YELLOW';
        threatTitle = precipitation >= 15 ? `🌧️ Heavy Rainfall Advisory (${locName})` : `🌀 Low Pressure Area (LPA) sa ${locName}`;
        threatDesc = `Mababang atmospheric pressure (${Math.round(pressure)} hPa) at pag-ulan (${precipitation} mm). Mag-ingat sa pag-apaw ng ilog at madudulas na kalsada.`;
      }

      // Extract Hourly Forecast (Next 8 Hours like Google Weather)
      const hourlyTimes: string[] = raw.hourly?.time || [];
      const hourlyTemps: number[] = raw.hourly?.temperature_2m || [];
      const hourlyCodes: number[] = raw.hourly?.weather_code || [];
      const hourlyPop: number[] = raw.hourly?.precipitation_probability || [];

      const currentIsoHour = new Date().toISOString().slice(0, 13);
      let startIdx = hourlyTimes.findIndex(t => t.startsWith(currentIsoHour));
      if (startIdx < 0) startIdx = 0;

      const hourlyForecast = hourlyTimes.slice(startIdx, startIdx + 8).map((timeStr, idx) => {
        const globalIdx = startIdx + idx;
        const hCode = hourlyCodes[globalIdx] || 0;
        const hMeta = weatherCodeMap[hCode] || { tl: "Maliwalas", en: "Clear", icon: "sunny-outline" };
        const d = new Date(timeStr);
        const hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHour = idx === 0 ? 'Now' : `${hours % 12 || 12} ${ampm}`;

        return {
          time: timeStr,
          displayTime: formattedHour,
          temperature: Math.round(hourlyTemps[globalIdx] ?? current.temperature_2m ?? 28),
          weatherCode: hCode,
          condition: hMeta.en,
          conditionTl: hMeta.tl,
          icon: hMeta.icon,
          precipitationProb: hourlyPop[globalIdx] || 0
        };
      });

      const formattedData = {
        location: {
          key: locationKey.toLowerCase(),
          municipality: locName,
          province: loc.province,
          latitude: lat,
          longitude: lng
        },
        availableLocations: Object.entries(SORSOGON_LOCATIONS).map(([k, v]) => ({
          key: k,
          name: v.name,
          province: v.province
        })),
        current: {
          temperature: Math.round(current.temperature_2m || 28),
          apparentTemperature: Math.round(current.apparent_temperature || 31),
          humidity: current.relative_humidity_2m || 80,
          precipitationMm: current.precipitation || 0,
          pressureHpa: Math.round(pressure),
          windSpeedKmh: Math.round(windSpeed),
          windGustsKmh: Math.round(windGusts),
          weatherCode,
          conditionLabel: meta.tl,
          conditionEn: meta.en,
          icon: meta.icon,
          severity: meta.severity,
          updatedAt: new Date().toISOString()
        },
        hourlyForecast,
        stormAlert: {
          hasActiveThreat,
          category: threatCategory,
          advisoryLevel,
          windSignal,
          title: threatTitle,
          description: threatDesc
        },
        dailyForecast: (raw.daily?.time || []).slice(0, 5).map((dateStr: string, idx: number) => {
          const dCode = raw.daily?.weather_code?.[idx] || 0;
          const dMeta = weatherCodeMap[dCode] || { tl: "Maliwalas", en: "Clear", icon: "sunny-outline" };
          return {
            date: dateStr,
            maxTemp: Math.round(raw.daily?.temperature_2m_max?.[idx] || 31),
            minTemp: Math.round(raw.daily?.temperature_2m_min?.[idx] || 24),
            precipitationSum: raw.daily?.precipitation_sum?.[idx] || 0,
            maxWind: Math.round(raw.daily?.wind_speed_10m_max?.[idx] || 15),
            condition: dMeta.en,
            conditionTl: dMeta.tl,
            icon: dMeta.icon
          };
        })
      };

      locationCache.set(cacheKey, {
        data: formattedData,
        cachedAt: now
      });

      return formattedData;
    } catch (err: any) {
      console.error(`[WeatherService] Error fetching weather for ${locName}:`, err?.message || err);
      const fallbackCached = locationCache.get(cacheKey);
      if (fallbackCached) return fallbackCached.data;

      return {
        location: { key: locationKey.toLowerCase(), municipality: locName, province: loc.province },
        availableLocations: Object.entries(SORSOGON_LOCATIONS).map(([k, v]) => ({
          key: k,
          name: v.name,
          province: v.province
        })),
        current: {
          temperature: 28,
          apparentTemperature: 31,
          humidity: 80,
          precipitationMm: 0,
          pressureHpa: 1012,
          windSpeedKmh: 12,
          windGustsKmh: 20,
          conditionLabel: "Maliwalas ang Panahon",
          conditionEn: "Fair Weather",
          icon: "partly-sunny-outline",
          severity: "NORMAL",
          updatedAt: new Date().toISOString()
        },
        stormAlert: {
          hasActiveThreat: false,
          category: "NONE",
          advisoryLevel: "NONE",
          windSignal: 0,
          title: `Maliwalas / Normal ang Panahon sa ${locName}`,
          description: `Walang aktibong banta ng bagyo o sama ng panahon sa ${locName} sa kasalukuyan.`
        }
      };
    }
  }
}
