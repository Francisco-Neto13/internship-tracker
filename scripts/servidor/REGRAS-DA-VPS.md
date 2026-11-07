# Regras desta VPS

Vale para qualquer projeto neste servidor e para quem trabalhar nele, pessoa ou agente. Ler antes de
subir um projeto novo. A cópia oficial fica em `scripts/servidor/REGRAS-DA-VPS.md`, no repositório
do Internship Tracker; o deploy a instala aqui, em `/srv/`.

**Ver como está o disco:** `vps-espaco`

## Disco

O disco é dividido entre os projetos: o que um reserva, os outros perdem, mesmo sem uso.

1. **Não reservar espaço "por garantia".** Nada de volume, arquivo ou partição de tamanho fixo além do
   que o projeto usa agora, com folga para alguns meses. Aumentar depois é fácil; diminuir exige tirar
   o sistema do ar.
2. **Cofre criptografado:** no máximo 30% do disco. `cofre-criar.sh` recusa mais do que isso.
3. **Olhar o uso real.** `du` mostra o que está reservado, e `du --apparent-size` mostra o que há de
   dado. Número muito diferente entre os dois é reserva, não dado.
4. **SeaweedFS** reserva 7 volumes × o limite de cada um, por bucket. Usar
   `-master.volumeSizeLimitMB=128` (896 MB por bucket). Com o padrão de 1 GB, são 7 GB por bucket vazio.
5. **Banco, MinIO, Elasticsearch e parecidos:** conferir na documentação se reservam espaço ou memória
   ao iniciar, e medir depois de subir.
6. **Antes e depois de subir um projeto, rodar `vps-espaco`.** Abaixo de 20% livre, resolver antes de
   continuar.

O Docker daqui já limita o cache de build a 3 GB e os logs a 30 MB por contêiner (`/etc/docker/daemon.json`).
Não remover.

## Memória

A VPS tem 8 GB e nenhum swap. Contêiner sem teto pode consumir a máquina inteira e derrubar todos os
projetos, não só o dele.

1. **Todo serviço que fica no ar tem `mem_limit` no compose.** Estourou, o kernel mata só aquele
   contêiner e o `restart` o sobe de novo.
2. **A soma dos tetos fica abaixo de 5 GB.** O resto é do sistema e dos builds, que rodam fora dos
   contêineres e pedem cerca de 2 GB cada.
3. **Tmpfs conta como memória do contêiner:** sempre com `size=`.
4. **Ver uso e teto:** `docker stats --no-stream`. Mortes por falta de memória:
   `journalctl -k | grep -i "killed process"`.

Tetos atuais (soma 4,5 GB):

| Contêiner | Teto |
|---|---|
| proxy (`/srv/proxy`) | 256 MB |
| portfolio | 768 MB |
| gastos: app / postgres | 768 MB / 512 MB |
| internship-tracker: app / postgres / storage | 768 MB cada |

Para mudar um teto sem reiniciar: `docker update --memory <valor> --memory-swap <valor> <contêiner>`.
Depois, gravar o mesmo valor no compose do projeto, senão o próximo deploy volta ao antigo.

## Internship Tracker

Quem mexer aqui não pode derrubar o que já está no ar.

- **Dados de saúde:** os dados dele ficam no cofre em `/srv/dados`. Não ler, copiar nem listar o conteúdo
  sem autorização. Outro projeto com acesso de administrador alcança esses dados: com dados reais, a
  recomendação é separar a VPS.
- **Docker só sobe depois do cofre.** Depois de reiniciar, todos os contêineres, de qualquer projeto,
  ficam parados até alguém rodar `cofre-abrir.sh`. Nunca habilitar o Docker no boot.
- **Portas 80 e 443 são do proxy do servidor, em `/srv/proxy`.** Ele não pertence a nenhum projeto. O
  projeto novo entra com um arquivo em `/srv/proxy/sites/`, a rede `borda` no compose dele e
  `sh /srv/proxy/recarregar.sh`, sem mexer no tracker. O Docker ignora o ufw: contêiner não publica porta.
- **Não rodar nos contêineres dele** `docker compose down -v` nem `docker system prune --volumes`.
- **Backup:** o tracker tem o próprio, em `scripts/servidor/backup.sh`. Projeto novo precisa do seu.

## Antes de reservar, apagar ou redimensionar qualquer coisa

Perguntar. E, se for dado, conferir antes se existe backup que abre.
