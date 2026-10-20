import { rotasColecao } from "../concedentes/classificacao-routes";

// RF013: setor values (deactivated, never deleted)
const rotas = rotasColecao("setor");
export const GET = rotas.GET;
export const POST = rotas.POST;
