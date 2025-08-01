import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export const listUsers = async () => {
  const res = await axios.get(`${API_URL}/users`);
  return res.data;
};

export const createUser = async (data) => {
  const res = await axios.post(`${API_URL}/create-user`, data);
  return res.data;
};

export const deleteUser = async (username) => {
  const res = await axios.delete(`${API_URL}/delete-user/${username}`);
  return res.data;
};
