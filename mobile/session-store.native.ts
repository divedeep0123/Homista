import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'homista_access_token';

export const readSessionToken = () => SecureStore.getItemAsync(SESSION_KEY);
export const writeSessionToken = (token: string) => SecureStore.setItemAsync(SESSION_KEY, token);
export const clearSessionToken = () => SecureStore.deleteItemAsync(SESSION_KEY);
