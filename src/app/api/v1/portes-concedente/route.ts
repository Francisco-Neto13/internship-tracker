import { rotasColecao } from "../concedentes/classificacao-routes";

// RF013: porte values (deactivated, never deleted)
const rotas = rotasColecao("porte");
export const GET = rotas.GET;
export const POST = rotas.POST;
