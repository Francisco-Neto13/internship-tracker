import { authenticatedRoute, dataResponse } from "@/lib/api";
import { lerTodas } from "@/shared/notificacoes/notificacao-service";

// RF070: marks every notification of the caller as read
export const POST = authenticatedRoute(async ({ identity }) => dataResponse({ marcadas: await lerTodas(identity) }));
