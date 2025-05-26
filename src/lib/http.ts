import envConfig from "@/config";
import { normalizePath } from "@/lib/utils";
import { LoginResType } from "@/schemaValidations/auth.schema";
import { redirect } from "next/navigation";

type CustomOptions = Omit<RequestInit, "method"> & {
  baseUrl?: string | undefined;
  params?: Record<string, string | number | boolean | undefined>;
};

const ENTITY_ERROR_STATUS = 422;
const AUTHENTICATION_ERROR_STATUS = 401;
const FORBIDDEN_ERROR_STATUS = 403;
const BAD_REQUEST_STATUS = 400;

type EntityErrorPayload = {
  message: string;
  errors: {
    field: string;
    message: string;
  }[];
};

type BadRequestErrorPayload = {
  statusCode: number;
  error: string;
  message: string;
  data: any;
};

export class HttpError extends Error {
  status: number;
  payload: any;
  constructor({
    status,
    payload,
    message = "Lỗi HTTP",
  }: {
    status: number;
    payload: any;
    message?: string;
  }) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export class EntityError extends HttpError {
  status: typeof ENTITY_ERROR_STATUS;
  payload: EntityErrorPayload;
  constructor({
    status,
    payload,
  }: {
    status: typeof ENTITY_ERROR_STATUS;
    payload: EntityErrorPayload;
  }) {
    super({ status, payload, message: "Lỗi thực thể" });
    this.status = status;
    this.payload = payload;
  }
}

export class BadRequestError extends HttpError {
  status: typeof BAD_REQUEST_STATUS;
  payload: BadRequestErrorPayload;
  constructor({
    status,
    payload,
  }: {
    status: typeof BAD_REQUEST_STATUS;
    payload: BadRequestErrorPayload;
  }) {
    super({ status, payload, message: payload.error || "Lỗi yêu cầu" });
    this.status = status;
    this.payload = payload;
  }
}

export class ForbiddenError extends HttpError {
  status: typeof FORBIDDEN_ERROR_STATUS;
  payload: any;
  constructor({
    status,
    payload,
    message = "Không có quyền truy cập",
  }: {
    status: typeof FORBIDDEN_ERROR_STATUS;
    payload: any;
    message?: string;
  }) {
    super({ status, payload, message });
    this.status = status;
    this.payload = payload;
  }
}

let clientLogoutRequest: null | Promise<any> = null;
const isClient = typeof window !== "undefined";

const request = async <Response>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  options?: CustomOptions | undefined
) => {
  let body: FormData | string | undefined = undefined;
  if (options?.body instanceof FormData) {
    body = options.body;
  } else if (options?.body) {
    body = JSON.stringify(options.body);
  }

  const baseHeaders: { [key: string]: string } =
    body instanceof FormData
      ? {}
      : {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

  let accessToken: string | null = null;
  if (isClient) {
    accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      baseHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const baseUrl =
    options?.baseUrl === undefined
      ? envConfig.NEXT_PUBLIC_API_ENDPOINT
      : options.baseUrl;

  let fullUrl = `${baseUrl}/${normalizePath(url)}`;
  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
  }

  console.log(`>>>>>>> HTTP ${method} request:`, {
    url: fullUrl,
    body: body instanceof FormData ? "FormData" : body,
    headers: { ...baseHeaders, ...options?.headers },
    accessToken: accessToken ? `${accessToken.slice(0, 10)}...` : "No token",
  });

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...baseHeaders,
        ...options?.headers,
      } as any,
      body,
      method,
      credentials: "include", // Support session-based auth if needed
    });

    const contentType = res.headers.get("content-type") || "";
    let payload: any;

    if (contentType.includes("application/json")) {
      payload = await res.json();
    } else {
      payload = await res.text();
      // Attempt to extract error message from HTML
      const messageMatch = payload.match(/<p><b>Message<\/b> (.*?)<\/p>/);
      const extractedMessage = messageMatch
        ? messageMatch[1]
        : payload.slice(0, 100) + "...";
      if (!res.ok) {
        throw new HttpError({
          status: res.status,
          payload,
          message: `Non-JSON response: ${extractedMessage}`,
        });
      }
    }

    const data = {
      status: res.status,
      payload,
    };

    if (!res.ok) {
      if (
        res.status === ENTITY_ERROR_STATUS &&
        contentType.includes("application/json")
      ) {
        throw new EntityError(
          data as {
            status: 422;
            payload: EntityErrorPayload;
          }
        );
      } else if (
        res.status === BAD_REQUEST_STATUS &&
        contentType.includes("application/json")
      ) {
        throw new BadRequestError(
          data as {
            status: 400;
            payload: BadRequestErrorPayload;
          }
        );
      } else if (res.status === AUTHENTICATION_ERROR_STATUS) {
        if (isClient && !clientLogoutRequest) {
          clientLogoutRequest = fetch("/api/auth/logout", {
            method: "POST",
            headers: {
              ...baseHeaders,
            } as any,
          });
          try {
            await clientLogoutRequest;
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            clientLogoutRequest = null;
            location.href = `/login`;
          }
        } else if (!isClient) {
          const token = (options?.headers as any)?.Authorization?.split(
            "Bearer "
          )[1];
          redirect(`/logout?accessToken=${token}`);
        }
      } else if (res.status === FORBIDDEN_ERROR_STATUS) {
        let message = "Không có quyền truy cập.";
        if (
          typeof payload === "string" &&
          payload.includes("PermissionException")
        ) {
          message = "Bạn không có quyền truy cập endpoint này.";
        } else if (
          contentType.includes("application/json") &&
          payload.message
        ) {
          message = payload.message;
        }
        throw new ForbiddenError({
          status: FORBIDDEN_ERROR_STATUS,
          payload,
          message,
        });
      } else {
        let message = contentType.includes("application/json")
          ? payload.message || "Lỗi HTTP"
          : `Non-JSON response: ${payload.slice(0, 100)}...`;
        if (
          typeof payload === "string" &&
          payload.includes("PermissionException")
        ) {
          message = "Bạn không có quyền truy cập endpoint này.";
        }
        throw new HttpError({
          status: res.status,
          payload,
          message,
        });
      }
    }

    if (isClient) {
      const normalizeUrl = normalizePath(url);
      if (["api/v1/auth/login"].includes(normalizeUrl)) {
        const { access_token } = (payload as LoginResType).data;
        localStorage.setItem("accessToken", access_token);
      } else if ("api/v1/auth/token" === normalizeUrl) {
        const { accessToken, refreshToken } = payload as {
          accessToken: string;
          refreshToken: string;
        };
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
      } else if (["api/v1/auth/logout"].includes(normalizeUrl)) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }

    return data;
  } catch (error: any) {
    console.error(`HTTP ${method} error for ${fullUrl}:`, {
      message: error.message,
      status: error.status,
      payload: error.payload,
    });
    throw error;
  }
};

// Token refresh logic
const refreshToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new HttpError({
      status: 401,
      payload: null,
      message: "No refresh token available",
    });
  }
  try {
    const response = await fetch(
      `${envConfig.NEXT_PUBLIC_API_ENDPOINT}/api/v1/auth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      }
    );
    if (!response.ok) {
      throw new HttpError({
        status: response.status,
        payload: await response.text(),
        message: "Failed to refresh token",
      });
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await response.json();
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    return accessToken;
  } catch (error) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    location.href = "/login";
    throw error;
  }
};

// Wrapper for requests with token refresh
const requestWithRefresh = async <Response>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  options?: CustomOptions | undefined
): Promise<any> => {
  try {
    return await request<Response>(method, url, options);
  } catch (error: any) {
    if (error.status === AUTHENTICATION_ERROR_STATUS && isClient) {
      try {
        const newAccessToken = await refreshToken();
        const newOptions = {
          ...options,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        return await request<Response>(method, url, newOptions);
      } catch (refreshError) {
        throw refreshError;
      }
    }
    throw error;
  }
};

const http = {
  get<Response>(
    url: string,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return requestWithRefresh<Response>("GET", url, options);
  },
  post<Response>(
    url: string,
    body: any,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return requestWithRefresh<Response>("POST", url, { ...options, body });
  },
  put<Response>(
    url: string,
    body: any,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return requestWithRefresh<Response>("PUT", url, { ...options, body });
  },
  delete<Response>(
    url: string,
    options?: Omit<CustomOptions, "body"> | undefined
  ) {
    return requestWithRefresh<Response>("DELETE", url, options);
  },
};

export default http;
