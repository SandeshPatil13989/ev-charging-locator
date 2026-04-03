import axios from "axios";

const BASE = "http://localhost:5000";

export const getStations = () => axios.get(`${BASE}/stations`);

export const predictAvailability = (data) =>
  axios.post(`${BASE}/predict`, data);

export const getRoute = (start_id, end_id) =>
  axios.post(`${BASE}/route`, { start_id, end_id });

export const getRecommendations = (lat, lng, battery_km) =>
  axios.post(`${BASE}/recommend`, { lat, lng, battery_km });

export const getAnalytics = () => axios.get(`${BASE}/analytics`);

export const estimateCost = (data) =>
  axios.post(`${BASE}/estimate`, data);

export const submitReview = (data) =>
  axios.post(`${BASE}/review`, data);

export const getReviews = (station_id) =>
  axios.get(`${BASE}/reviews/${station_id}`);

export const getNearbyStations = (lat, lng, radius) =>
  axios.post(`${BASE}/nearby-stations`, { lat, lng, radius });