import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://hencedelivery.com'; 

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string) {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);

  const res = await api.post('/token', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  await AsyncStorage.setItem('token', res.data.access_token);
  return res.data;
}

export async function getMe() {
  const res = await api.get('/users/me');
  return res.data;
}

// ... add register, update profile, etc.