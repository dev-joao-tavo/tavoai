import axios from "axios";

const API_BASE_URL = "https://api.tavoai.com";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
