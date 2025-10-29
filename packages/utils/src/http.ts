import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { ZodSchema } from "zod";

export interface CreateHttpClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const instance = axios.create({
    baseURL: options.baseURL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "/api",
    headers: options.headers,
    timeout: options.timeoutMs ?? 15000,
  });

  return instance;
}

export async function getJson<T>(client: AxiosInstance, url: string, schema: ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.get(url, config);
  return schema.parse(res.data);
}

export async function postJson<T>(client: AxiosInstance, url: string, body: unknown, schema: ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.post(url, body, config);
  return schema.parse(res.data);
}
