import { Router, Request, Response } from 'express';
import { WeatherService, SORSOGON_LOCATIONS } from '../services/weatherService';

const router = Router();

router.get('/locations', (req: Request, res: Response) => {
  return res.json(
    Object.entries(SORSOGON_LOCATIONS).map(([key, loc]) => ({
      key,
      name: loc.name,
      province: loc.province,
      lat: loc.lat,
      lng: loc.lng,
    }))
  );
});

router.get('/irosin', async (req: Request, res: Response) => {
  try {
    const weather = await WeatherService.getWeather('irosin');
    return res.json(weather);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get weather data' });
  }
});

router.get('/:locationKey', async (req: Request, res: Response) => {
  try {
    const { locationKey } = req.params;
    const weather = await WeatherService.getWeather(locationKey);
    return res.json(weather);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get weather data' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const location = (req.query.location as string) || 'irosin';
    const weather = await WeatherService.getWeather(location);
    return res.json(weather);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get weather data' });
  }
});

export default router;
