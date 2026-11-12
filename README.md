# Dorsal

Aplicação web (instalável no telemóvel) para um grupo de amigos combinar provas de trail: calendário de provas em Portugal com link de inscrição, quem do grupo vai, quem já se inscreveu, e mensagens prontas para o WhatsApp.

- Sem contas: entra-se pelo link do grupo e escolhe-se o nome.
- Alojamento: GitHub Pages. Dados partilhados: Supabase (plano gratuito).
- `config.js` tem o endereço do projecto Supabase e a chave anónima (pública).
- `supabase/schema.sql` cria as tabelas e as regras de acesso.
- `provas.json` é a lista de provas de reserva, usada quando não há ligação ao servidor.

Instalar no telemóvel: abrir o link do grupo no navegador e escolher "Adicionar ao ecrã principal".
