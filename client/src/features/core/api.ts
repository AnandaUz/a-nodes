import type { INode } from "@shared/types";
// import {
//   getToken,
//   refreshAccessToken,
//   removeTokens,
// } from "../../services/auth.service";

class API {
  private API_URL = import.meta.env.VITE_API_URL;

  async fetchWithAuth(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // const token = getToken();
    // if (token && !headers.has("Authorization")) {
    //   headers.set("Authorization", `Bearer ${token}`);
    // }
    const config: RequestInit = { method: "GET", ...options, headers };
    return fetch(`${this.API_URL}${path}`, config);

    // const token = getToken();

    // if (!headers.has("Content-Type")) {
    //   headers.set("Content-Type", "application/json");
    // }
    // if (token && !headers.has("Authorization")) {
    //   headers.set("Authorization", `Bearer ${token}`);
    // }

    // // const config: RequestInit = { method: "GET", ...options, headers };

    // const response = await fetch(`${this.API_URL}${path}`, config);

    // if (response.status === 401) {
    //   const newToken = await refreshAccessToken();
    //   if (!newToken) {
    //     removeTokens();
    //     history.pushState({}, "", "/welcome");
    //     // render();
    //     throw new Error("Сессия истекла");
    //   }
    //   headers.set("Authorization", `Bearer ${newToken}`);
    //   return fetch(`${this.API_URL}${path}`, { ...config, headers });
    // }

    // return response;
  }

  async loadNodes(parentId?: string) {
    const res = await this.fetchWithAuth(`/nodes/${parentId ?? "root"}`);
    if (!res.ok) {
      console.warn("[ServerPersistence] Ошибка загрузки:", res.status);
      return;
    }
    return await res.json();
  }
  async saveNodes(nodes: INode[]) {
    const data = { nodes };
    const response = await this.fetchWithAuth("/nodes/saveNodes", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const result = (await response.json()) as { ids: string[] };
    return result.ids;
  }
  // async saveNode(node: INode): Promise<string> {
  //   const data = { node };
  //   const response = await this.fetchWithAuth("/nodes/saveNode", {
  //     method: "PUT",
  //     body: JSON.stringify(data),
  //   });
  //   const result = (await response.json()) as { node: INode };
  //   return result.node?._id ?? "";
  // }
}

const api = new API();
export default api;
