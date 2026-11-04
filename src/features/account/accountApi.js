import { accountApiUrl } from "../../shared/firebase/client.js";

export class AccountApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AccountApiError";
    this.status = status;
  }
}

export async function callAccountApi(path, payload = {}, idToken = "") {
  if (!accountApiUrl) {
    throw new AccountApiError(
      "A API de contas ainda não foi configurada. Publique o Worker e defina VITE_ACCOUNT_API_URL no GitHub.",
    );
  }
  let response;
  try {
    response = await fetch(accountApiUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: "Bearer " + idToken } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AccountApiError("Não foi possível conectar ao serviço de contas.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AccountApiError(result.error || "Não foi possível concluir a operação.", response.status);
  }
  return result;
}
