// Dorsal: conteúdos das secções do menu. Texto em português de Portugal.
// Os números entre parênteses rectos, por exemplo [1], remetem para a lista de fontes da própria secção.
window.DORSAL_SECOES = [
{
  id: "ferramentas", titulo: "Ferramentas", icone: "⚙",
  resumo: "Calcula o esforço de uma prova e planeia o abastecimento.",
  blocos: [
    { t: "calc-esforco" },
    { t: "calc-abast" },
    { t: "nota", x: "As calculadoras usam as convenções e recomendações citadas em baixo. Dão uma ordem de grandeza: o que cada pessoa tolera treina-se e varia." }
  ],
  fontes: [
    { t: "ITRA. Discover trail running (km-esforço: 1 km = 1; +100 m D+ = 1).", u: "https://itra.run/About/DiscoverTrailRunning" },
    { t: "UTMB. Categorias de prova por km-esforço.", u: "https://help.utmb.world/utmb-index-races-1" },
    { t: "Thomas DT, Erdman KA, Burke LM. ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 2016;48(3):543-68.", u: "https://doi.org/10.1249/MSS.0000000000000852" },
    { t: "Tiller NB et al. ISSN Position Stand: nutritional considerations for single-stage ultra-marathon training and racing. J Int Soc Sports Nutr 2019;16:50.", u: "https://doi.org/10.1186/s12970-019-0312-9" },
    { t: "Hew-Butler T et al. Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad 2015. Clin J Sport Med 2015;25(4):303-20.", u: "https://doi.org/10.1097/JSM.0000000000000221" }
  ]
},
{
  id: "preparacao", titulo: "Preparação física", icone: "▲",
  resumo: "Como aumentar a carga sem te lesionares, e porque o treino de força conta.",
  blocos: [
    { t: "factos", itens: [
      { n: "≈ ⅓", x: "do risco de lesão desportiva com treino de força, face a controlos (RR 0,315) [1]" },
      { n: "0,96", x: "RR do alongamento: sem efeito demonstrado na prevenção de lesões [1]" },
      { n: "> 30%", x: "de aumento da distância semanal em 2 semanas associou-se a mais lesões “de distância” [3]" }
    ]},
    { t: "h", x: "Progressão da carga" },
    { t: "p", x: "A “regra dos 10% por semana” é popular mas tem pouca base. Num coorte prospectivo de 1 ano, quem aumentou a distância semanal mais de 30% em 2 semanas teve mais lesões ligadas à distância (dor patelofemoral, síndrome da banda iliotibial, periostite tibial, tendinopatia rotuliana) do que quem aumentou menos de 10%: HR 1,59 (IC 95% 0,96–2,66; p = 0,07). É um sinal, não uma prova [3]." },
    { t: "p", x: "Dados mais recentes apontam para os picos numa única sessão: correr de repente muito mais do que a corrida mais longa dos últimos 30 dias associou-se a mais lesões, mais do que a variação de semana para semana [4]. Na prática: faz crescer a corrida longa aos poucos." },
    { t: "h", x: "Treino de força" },
    { t: "p", x: "Numa meta-análise de ensaios aleatorizados, o treino de força reduziu as lesões desportivas para menos de um terço e quase reduziu para metade as de sobrecarga; a propriocepção teve efeito menor (RR 0,55) e o alongamento nenhum (RR 0,963) [1]. A actualização de 2018 confirmou (RR 0,338; IC 95% 0,238–0,480) e encontrou relação dose-resposta: cada 10% a mais de volume de força reduziu o risco em mais de 4 pontos percentuais [2]. Os ensaios não foram feitos em corredores de trail; a extrapolação é razoável mas não está testada." },
    { t: "h", x: "O que se associa a lesão no trail" },
    { t: "lista", itens: [
      "Saltar o aquecimento [5].",
      "Não ter um plano de treino específico para trail [5].",
      "Treinar sobretudo em asfalto [5].",
      "Fazer dois treinos por dia [5].",
      "Ter uma profissão fisicamente exigente [5]."
    ]},
    { t: "p", x: "São associações de estudos observacionais com poucos participantes; servem para orientar, não para garantir [5]." },
    { t: "h", x: "Exemplo de semana para trail curto (até ~25 km)" },
    { t: "lista", itens: [
      "1 corrida longa em trilho, a ritmo de conversa, que cresce aos poucos.",
      "1 sessão de subidas: repetições de 1–3 min a subir forte, a descer a trote.",
      "1–2 corridas fáceis, de preferência em terra.",
      "2 sessões de força de 30–40 min: agachamento, peso morto romeno, elevação de gémeos, step-down lento (prepara as descidas), prancha.",
      "Pelo menos 1 dia de descanso completo."
    ]},
    { t: "nota", x: "Isto é um exemplo de estrutura, não uma prescrição. Ajusta ao teu histórico, a lesões anteriores e ao tempo que tens." },
    { t: "h", x: "Descidas" },
    { t: "p", x: "A descer, os quadricípites trabalham em contracção excêntrica, que provoca mais dor muscular tardia nos dias seguintes. Treina descidas com regularidade e de forma progressiva antes de uma prova com muito desnível negativo." }
  ],
  fontes: [
    { t: "Lauersen JB, Bertelsen DM, Andersen LB. The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of RCTs. Br J Sports Med 2014;48:871-7.", u: "https://doi.org/10.1136/bjsports-2013-092538" },
    { t: "Lauersen JB, Andersen TE, Andersen LB. Strength training as superior, dose-dependent and safe prevention of acute and overuse sports injuries. Br J Sports Med 2018;52:1557-63.", u: "https://doi.org/10.1136/bjsports-2018-099078" },
    { t: "Nielsen RO et al. Excessive progression in weekly running distance and risk of running-related injuries. J Orthop Sports Phys Ther 2014;44(10):739-47.", u: "https://doi.org/10.2519/jospt.2014.5164" },
    { t: "Lindman I, Nielsen RO. How much running is too much? A new take on injury risk for runners. BJSM Blog.", u: "https://blogs.bmj.com/bjsm/?p=11751" },
    { t: "Viljoen C et al. Trail running injury risk factors: a living systematic review. Br J Sports Med 2022;56(10):577-87.", u: "https://doi.org/10.1136/bjsports-2021-104858" }
  ]
},
{
  id: "nutricao", titulo: "Nutrição e hidratação", icone: "◉",
  resumo: "Quanto comer e beber durante a prova, e o risco de beber demais.",
  blocos: [
    { t: "factos", itens: [
      { n: "30–60 g/h", x: "de hidratos de carbono em esforços de 1 a 2,5 horas [1]" },
      { n: "até 90 g/h", x: "acima de 2,5 h, com mistura glucose + frutose [1][2]" },
      { n: "1%", x: "dos atletas de provas de resistência teve hiponatremia sintomática num estudo grande [4]" }
    ]},
    { t: "h", x: "Durante a prova" },
    { t: "p", x: "Para esforços de 1 a 2,5 horas, a recomendação é 30–60 g de hidratos de carbono por hora. Em provas acima de 2,5 h, ingestões até 90 g/h associam-se a melhor rendimento, desde que combinem açúcares com transportadores intestinais diferentes (glucose ou maltodextrina com frutose) [1][2]. Há dados de que atletas treinados oxidam até 120 g/h, mas a vantagem de doses tão altas ainda não está demonstrada [3]." },
    { t: "p", x: "Em ultras, a posição da ISSN aponta para 150–400 kcal/h (30–50 g de hidratos e 5–10 g de proteína por hora), variando os alimentos, porque com as horas cresce a preferência por salgado [5]. O intestino treina-se: experimenta nos treinos longos o que vais comer na prova [5]." },
    { t: "h", x: "Beber: com sede, não por calendário" },
    { t: "p", x: "A hiponatremia associada ao exercício resulta sobretudo de beber mais do que se perde. A estratégia mais segura é beber quando se tem sede [4]. Os sintomas vão de tonturas e náuseas a dor de cabeça, vómitos, confusão e convulsões, por edema cerebral; os casos graves podem ser fatais [4]." },
    { t: "p", x: "Como ordem de grandeza, a ISSN sugere 450–750 mL/h em ultras, e pode ser preciso mais sódio do que o da maioria das bebidas comerciais (> 575 mg/L), sobretudo com calor [5]. Ganhar peso durante uma prova é sinal de que estás a beber demais [4]." },
    { t: "h", x: "No dia-a-dia de treino" },
    { t: "lista", itens: [
      "Hidratos de carbono: cerca de 5–8 g/kg/dia em fases de treino exigente [5].",
      "Proteína: cerca de 1,6 g/kg/dia; até 2,5 g/kg/dia em fases muito exigentes [5].",
      "O problema mais comum em ultras é comer de menos, não escolher mal os macronutrientes [5]."
    ]},
    { t: "nota", x: "Quem tem diabetes, doença renal, cardíaca ou toma diuréticos deve combinar a estratégia de hidratação e sódio com o seu médico." }
  ],
  fontes: [
    { t: "Thomas DT, Erdman KA, Burke LM. ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 2016;48(3):543-68.", u: "https://doi.org/10.1249/MSS.0000000000000852" },
    { t: "Jeukendrup AE. Multiple transportable carbohydrates and their benefits. GSSI Sports Science Exchange 108, 2013.", u: "https://www.gssiweb.org/en/sports-science-exchange/Article/sse-108-multiple-transportable-carbohydrates-and-their-benefits" },
    { t: "From Metabolism to Medals: Contemporary Perspectives and Revisiting Carbohydrate Guidelines for Fuelling Endurance Athletes During Exercise. University of Bath.", u: "https://researchportal.bath.ac.uk/en/publications/from-metabolism-to-medals-contemporary-perspectives-and-revisitin/" },
    { t: "Hew-Butler T et al. Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad 2015. Clin J Sport Med 2015;25(4):303-20.", u: "https://doi.org/10.1097/JSM.0000000000000221" },
    { t: "Tiller NB et al. ISSN Position Stand: nutritional considerations for single-stage ultra-marathon training and racing. J Int Soc Sports Nutr 2019;16:50.", u: "https://doi.org/10.1186/s12970-019-0312-9" }
  ]
},
{
  id: "equipamento", titulo: "Equipamento", icone: "▣",
  resumo: "Lista para preparar a mochila. Marca o que já tens pronto.",
  blocos: [
    { t: "nota", x: "O material obrigatório muda de prova para prova: confirma sempre no regulamento. As marcas ficam guardadas neste telemóvel." },
    { t: "checklist", id: "mochila", grupos: [
      { h: "Corpo", itens: ["Sapatilhas de trail com sola adequada ao terreno", "Meias técnicas (sem costuras)", "Roupa técnica que não seja algodão", "Corta-vento ou impermeável com capuz", "Camada térmica de manga comprida", "Boné ou buff", "Luvas finas (inverno ou serra)"] },
      { h: "Água e comida", itens: ["Colete ou mochila de hidratação", "Flasks ou reservatório cheios", "Copo reutilizável (muitas provas já não dão copos)", "Géis, barras ou comida real para o plano por hora", "Sais ou bebida com sódio"] },
      { h: "Segurança", itens: ["Telemóvel carregado, com o número da organização", "Manta térmica", "Apito", "Frontal com pilhas ou bateria de reserva", "Ligadura elástica e adesivo para bolhas", "Documento de identificação"] },
      { h: "Navegação e conforto", itens: ["Track GPX no relógio ou no telemóvel (offline)", "Bastões (confirma se são permitidos)", "Óculos de sol e protector solar", "Creme anti-atrito para zonas de fricção", "Dorsal e alfinetes ou cinto porta-dorsal"] }
    ]}
  ],
  fontes: []
},
{
  id: "seguranca", titulo: "Segurança na serra", icone: "✚",
  resumo: "O que fazer antes de sair e quando algo corre mal.",
  blocos: [
    { t: "h", x: "Antes de sair" },
    { t: "lista", itens: [
      "Vê a previsão do IPMA para o local e para a hora em que vais estar lá em cima.",
      "Diz a alguém o percurso e a hora prevista de regresso.",
      "Leva o track descarregado: muitas serras não têm rede.",
      "Bateria do telemóvel cheia; em modo de poupança gasta menos.",
      "Em época de incêndios, respeita interdições de acesso a zonas florestais. Na época de caça, usa cores vivas."
    ]},
    { t: "h", x: "Quando algo corre mal" },
    { t: "lista", itens: [
      "Emergência: 112. Diz onde estás com coordenadas (as apps de mapas e a função de emergência do telemóvel mostram-nas).",
      "Frio, vento e chuva: veste-te antes de arrefecer, abriga-te do vento, usa a manta térmica.",
      "Calor: abranda, procura sombra, molha a cabeça e o pescoço. Confusão ou desmaio com calor é uma emergência.",
      "Se encontrares um atleta em dificuldade numa prova, fica com ele e avisa o posto ou a organização."
    ]},
    { t: "h", x: "Lesões e queixas mais comuns" },
    { t: "p", x: "Numa revisão sistemática de 16 estudos (8644 participantes), o pé foi o local mais lesionado, seguido do joelho, perna, coxa e tornozelo. Os diagnósticos mais frequentes foram feridas e escoriações, depois bolhas, distensões musculares, cãibras e entorses. Entre as doenças, dominaram as queixas gastrointestinais (náuseas e vómitos) [1]. Nas queimaduras solares, a idade mais jovem e a pele clara associaram-se a maior risco [2]." },
    { t: "h", x: "Sinais para parar" },
    { t: "p", x: "Dor ou aperto no peito, desmaio ou quase-desmaio, palpitações fora do habitual ou falta de ar desproporcionada ao esforço: pára e procura avaliação médica. Na prova, avisa o posto de socorro mais próximo." },
    { t: "h", x: "Respeitar a serra" },
    { t: "p", x: "Não deixes lixo, incluindo invólucros de géis, e não cortes caminho fora do trilho: aumenta a erosão e pode valer desclassificação." }
  ],
  fontes: [
    { t: "Viljoen CT et al. Epidemiology of injury and illness among trail runners: a systematic review. Sports Med 2021;51:917-43.", u: "https://doi.org/10.1007/s40279-020-01418-1" },
    { t: "Viljoen C et al. Trail running injury risk factors: a living systematic review. Br J Sports Med 2022;56(10):577-87.", u: "https://doi.org/10.1136/bjsports-2021-104858" }
  ]
},
{
  id: "saude", titulo: "Saúde", icone: "♥",
  resumo: "O que a evidência diz sobre correr, longevidade e articulações.",
  blocos: [
    { t: "factos", itens: [
      { n: "−27%", x: "de risco de morte por qualquer causa em quem corre, face a quem não corre [1]" },
      { n: "−30%", x: "de mortalidade cardiovascular; −23% por cancro [1]" },
      { n: "3,5%", x: "de artrose de anca ou joelho em corredores recreativos; 10,2% em sedentários [3]" }
    ]},
    { t: "h", x: "Longevidade" },
    { t: "p", x: "Uma meta-análise de 14 estudos de 6 coortes prospectivos (232 149 pessoas, seguimento de 5,5 a 35 anos) encontrou HR 0,73 (IC 95% 0,68–0,79) para mortalidade total, 0,70 (0,49–0,98) para cardiovascular e 0,77 para cancro em quem corre [1]. O benefício apareceu mesmo com uma corrida por semana ou menos de 50 minutos semanais, sem relação dose-resposta significativa com frequência, duração, ritmo ou volume [1]." },
    { t: "p", x: "Limitação: são estudos observacionais. Quem corre difere de quem não corre em muitos outros factores, e os estudos ajustam só parte deles." },
    { t: "h", x: "Quanto exercício" },
    { t: "p", x: "A OMS recomenda a todos os adultos 150–300 min de actividade moderada ou 75–150 min de actividade vigorosa por semana, e treino de força para os grandes grupos musculares em 2 ou mais dias [2]." },
    { t: "h", x: "Articulações" },
    { t: "p", x: "Numa meta-análise de 17 estudos (114 829 pessoas), a prevalência de artrose da anca ou joelho foi 3,5% em corredores recreativos, 10,2% em sedentários e 13,3% em corredores de competição [3]. O risco aumentado pareceu concentrar-se no volume e intensidade de alta competição. Os autores não conseguiram excluir confundimento por lesões anteriores nem estabelecer causalidade [3]." },
    { t: "h", x: "Riscos próprios do trail" },
    { t: "p", x: "A incidência de lesões varia muito entre estudos, de 0,7 a 61,2 por 1000 horas de corrida, pela heterogeneidade das definições e das provas [4]. Ver também as secções Segurança na serra e Nutrição (hiponatremia)." },
    { t: "nota", x: "Informação geral, baseada na literatura citada. Não substitui avaliação médica individual, sobretudo se tens doença cardíaca, sintomas ao esforço ou estás a começar depois de muito tempo parado." }
  ],
  fontes: [
    { t: "Pedisic Z et al. Is running associated with a lower risk of all-cause, cardiovascular and cancer mortality, and is the more the better? A systematic review and meta-analysis. Br J Sports Med 2020;54(15):898.", u: "https://doi.org/10.1136/bjsports-2018-100493" },
    { t: "Bull FC et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med 2020;54:1451-62.", u: "https://doi.org/10.1136/bjsports-2020-102955" },
    { t: "Alentorn-Geli E et al. The association of recreational and competitive running with hip and knee osteoarthritis: a systematic review and meta-analysis. J Orthop Sports Phys Ther 2017;47(6):373-90.", u: "https://doi.org/10.2519/jospt.2017.7137" },
    { t: "Viljoen C et al. Trail running injury risk factors: a living systematic review. Br J Sports Med 2022;56(10):577-87.", u: "https://doi.org/10.1136/bjsports-2021-104858" }
  ]
},
{
  id: "historia", titulo: "História do trail", icone: "⌛",
  resumo: "De um cavalo coxo na Califórnia ao Mundial no Gerês.",
  blocos: [
    { t: "linha", itens: [
      { a: "Antes de 1974", x: "As corridas em trilhos e em montanha já existiam há mais de um século; em 1974 havia pelo menos oito ultras em trilho no mundo [1]." },
      { a: "1974", x: "Gordy Ainsleigh, cujo cavalo coxeara no ano anterior, faz a pé os 100 milhas da Tevis Cup, uma prova equestre na Serra Nevada, em 23 h 42 min [2]. Nasce a Western States 100." },
      { a: "1977", x: "Primeira Western States oficial: 14 partem, 3 terminam [3]. No mesmo ano nasce a Sierre-Zinal, na Suíça [4]." },
      { a: "1985", x: "Primeiro Campeonato do Mundo de Corrida de Montanha [5]." },
      { a: "2003", x: "Catherine e Michel Poletti criam o UTMB em Chamonix. Esperavam cerca de 300 atletas, partiram 722 e só 67 terminaram dentro do tempo [6]. Começa o boom europeu dos anos 2000 [4]." },
      { a: "2007", x: "Primeiro Mundial de Trail, no Texas: cerca de 80 km [7]." },
      { a: "2012", x: "Em Novembro é criada a Associação de Trail Running de Portugal (ATRP), hoje filiada na Federação Portuguesa de Atletismo e na ITRA [8]." },
      { a: "2013", x: "Fundação da International Trail Running Association (ITRA) [4]." },
      { a: "2015", x: "O trail é reconhecido como disciplina do atletismo pela IAAF, hoje World Athletics [9]." },
      { a: "2016", x: "Mundial de Trail em Portugal, no Parque Nacional da Peneda-Gerês, a 29 de Outubro: 85 km e 4650 m de desnível positivo, 234 atletas de 38 países. Ganham Luis Alberto Hernando e Caroline Chaverot [10]." },
      { a: "2017", x: "Só em Portugal continental contam-se 354 eventos de trail e cerca de 700 corridas [8]." },
      { a: "2022–2023", x: "Montanha e trail passam a ter um Mundial conjunto: Chiang Mai (2022) e Innsbruck-Stubai (2023) [5]." }
    ]}
  ],
  fontes: [
    { t: "Crockett D. Gordy Ainsleigh's Western States Run 50 Years Ago (Ultrarunning History).", u: "https://audible.co.uk/podcast/161-Gordy-Ainsleighs-Western-States-Run-50-Years-Ago/B0DBFKCNXP" },
    { t: "Western States Endurance Run — história.", u: "https://web.arch.virginia.edu/arch547/Archive/2019/Lewis/ws_test.html" },
    { t: "Marathon Handbook. Hell and High Trails: The Story Behind the Western States 100.", u: "https://marathonhandbook.com/hell-and-high-trails-the-story-behind-the-western-states-100/" },
    { t: "World Athletics. Mountain and Trail Running.", u: "https://www.worldathletics.org/disciplines/trail-running" },
    { t: "iRunFar. Elevating Competition: The History of the Trail World Championships.", u: "https://www.irunfar.com/elevating-competition-the-history-of-the-trail-world-championships" },
    { t: "Cimalp. The history of the UTMB, from 2003 to today.", u: "https://www.cimalp.com/en/blogs/the-cimalp-blog/history-of-the-utmb" },
    { t: "WMTRC Innsbruck-Stubai 2023. A look back at the history of the World Trail Championships.", u: "https://innsbruck-stubai2023.com/en/?p=10578" },
    { t: "Julião RP et al. Trail running em Portugal e espaços naturais (Congresso Ibérico, Univ. Nova de Lisboa).", u: "https://run.unl.pt/bitstream/10362/73098/1/Congresso_Iberico_3_Espacos_Naturais.pdf" },
    { t: "World Athletics. Trail running — disciplina reconhecida em 2015.", u: "https://WWW.WORLDATHLETICS.ORG/disciplines/trail-running/trail-running" },
    { t: "Irish Mountain Running Association. IAU Trail World Championships 2016, Peneda-Gerês.", u: "https://imra.ie/events/report/id/1323" }
  ]
},
{
  id: "glossario", titulo: "Glossário", icone: "Aa",
  resumo: "Os termos que aparecem nos regulamentos e nas conversas do grupo.",
  blocos: [
    { t: "termos", itens: [
      ["D+ / D−", "Desnível positivo / negativo acumulado: total de metros que se sobem / descem no percurso."],
      ["Km-esforço", "Distância + D+/100. Uma prova de 50 km com 2500 m D+ tem 75 km-esforço. Usado pela ITRA e pelo UTMB para classificar provas."],
      ["Abastecimento", "Posto com água e comida ao longo do percurso. Nem todos têm sólidos."],
      ["Barreira horária", "Hora limite para passar num ponto. Quem chega depois é retirado da prova."],
      ["Material obrigatório", "Lista do regulamento que tens de levar e que pode ser verificada na partida ou durante a prova."],
      ["DNF / DNS", "Did Not Finish (desistiu) / Did Not Start (inscrito que não partiu)."],
      ["Trail curto / longo / ultra", "Categorias por distância. Os limites variam entre organizações; ultra é qualquer prova acima da maratona."],
      ["Skyrunning", "Corrida em alta montanha, com declives fortes e por vezes passagens técnicas."],
      ["Quilómetro vertical (KV)", "Prova curta e muito inclinada, com cerca de 1000 m de D+."],
      ["Backyard ultra", "Formato em voltas de cerca de 6,7 km, uma por hora. Ganha quem completar mais voltas; os outros desistem."],
      ["Single-track", "Trilho estreito onde só cabe uma pessoa de cada vez. Ultrapassar exige pedir passagem."],
      ["Vassoura", "Elemento da organização que segue atrás do último atleta e fecha o percurso."],
      ["Índice ITRA / UTMB", "Pontuação de desempenho calculada a partir dos resultados em provas certificadas."],
      ["Frontal", "Lanterna de cabeça. Obrigatória em provas nocturnas ou que acabam depois do pôr-do-sol."],
      ["Bastões", "Ajudam a subir e aliviam as descidas. Algumas provas proíbem-nos."],
      ["Fartlek", "Treino com mudanças de ritmo livres, conforme o terreno ou a vontade."]
    ]}
  ],
  fontes: []
}
];
