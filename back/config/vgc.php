<?php

/*
|--------------------------------------------------------------------------
| Regras de montagem de time (VGC)
|--------------------------------------------------------------------------
|
| Baseado no VGC 2026, jogado em Pokémon Champions:
|
| - Time registrado com 6 pokémons; em cada batalha (dupla) o jogador
|   escolhe 4, e os 2 primeiros entram em campo.
| - Todos os pokémons são ajustados para o nível 50.
| - Species Clause: nada de dois pokémons com o mesmo número na dex nacional.
| - Item Clause: nenhum item pode se repetir no time.
| - Em Champions não existem IVs (tudo é 31) e os EVs viraram "Stat
|   Points": 66 no total, no máximo 32 por stat, cada ponto soma +1 no
|   stat final no nível 50.
|
| Lendários: as regras só separam os "restritos" (lendários de capa, lista
| abaixo) e os míticos. Aqui: até 2 restritos por time e míticos
| proibidos. Qualquer outro lendário conta como pokémon comum.
|
| Este arquivo também é exposto pro front em GET /api/vgc/rules, então o
| front nunca precisa duplicar essas regras na mão.
|
*/

return [

    'regulation' => 'VGC — até 2 restritos por time',

    'level' => 50,
    'team_size' => 6,
    'battle_size' => 4,
    'max_moves' => 4,

    'iv' => 31,

    'stat_points' => [
        'total' => 66,
        'per_stat' => 32,
    ],

    'max_restricted' => 2,
    'allow_mythical' => false,

    /*
     * Pokémons "restritos" (os lendários de capa/caixa), pelo número da dex
     * nacional. Não existe flag pra isso na PokeAPI — é uma definição das
     * regras oficiais do VGC.
     */
    'restricted' => [
        150,  // Mewtwo
        249,  // Lugia
        250,  // Ho-Oh
        382,  // Kyogre
        383,  // Groudon
        384,  // Rayquaza
        483,  // Dialga
        484,  // Palkia
        487,  // Giratina
        643,  // Reshiram
        644,  // Zekrom
        646,  // Kyurem
        716,  // Xerneas
        717,  // Yveltal
        718,  // Zygarde
        789,  // Cosmog
        790,  // Cosmoem
        791,  // Solgaleo
        792,  // Lunala
        800,  // Necrozma
        888,  // Zacian
        889,  // Zamazenta
        890,  // Eternatus
        898,  // Calyrex
        1007, // Koraidon
        1008, // Miraidon
        1024, // Terapagos
    ],

    /*
     * Banimentos avulsos, fora das categorias acima (número da dex nacional).
     */
    'banned' => [],

    /*
     * Pedra que cada mega precisa segurar (nome da forma => nome do item na
     * PokeAPI). Uma mega no time obrigatoriamente segura a sua pedra; a
     * forma base pode segurar a pedra ou qualquer outro item. A PokeAPI não
     * liga a pedra à mega, por isso a lista é fixa. Mega Rayquaza não tem
     * pedra (evolui pelo golpe Dragon Ascent), então fica livre.
     */
    'mega_stones' => [
        'venusaur-mega' => 'venusaurite',
        'charizard-mega-x' => 'charizardite-x',
        'charizard-mega-y' => 'charizardite-y',
        'blastoise-mega' => 'blastoisinite',
        'beedrill-mega' => 'beedrillite',
        'pidgeot-mega' => 'pidgeotite',
        'raichu-mega-x' => 'raichunite-x',
        'raichu-mega-y' => 'raichunite-y',
        'clefable-mega' => 'clefablite',
        'alakazam-mega' => 'alakazite',
        'victreebel-mega' => 'victreebelite',
        'slowbro-mega' => 'slowbronite',
        'gengar-mega' => 'gengarite',
        'kangaskhan-mega' => 'kangaskhanite',
        'starmie-mega' => 'starminite',
        'pinsir-mega' => 'pinsirite',
        'gyarados-mega' => 'gyaradosite',
        'aerodactyl-mega' => 'aerodactylite',
        'dragonite-mega' => 'dragoninite',
        'mewtwo-mega-x' => 'mewtwonite-x',
        'mewtwo-mega-y' => 'mewtwonite-y',
        'meganium-mega' => 'meganiumite',
        'feraligatr-mega' => 'feraligite',
        'ampharos-mega' => 'ampharosite',
        'steelix-mega' => 'steelixite',
        'scizor-mega' => 'scizorite',
        'heracross-mega' => 'heracronite',
        'skarmory-mega' => 'skarmorite',
        'houndoom-mega' => 'houndoominite',
        'tyranitar-mega' => 'tyranitarite',
        'sceptile-mega' => 'sceptilite',
        'blaziken-mega' => 'blazikenite',
        'swampert-mega' => 'swampertite',
        'gardevoir-mega' => 'gardevoirite',
        'sableye-mega' => 'sablenite',
        'mawile-mega' => 'mawilite',
        'aggron-mega' => 'aggronite',
        'medicham-mega' => 'medichamite',
        'manectric-mega' => 'manectite',
        'sharpedo-mega' => 'sharpedonite',
        'camerupt-mega' => 'cameruptite',
        'altaria-mega' => 'altarianite',
        'banette-mega' => 'banettite',
        'chimecho-mega' => 'chimechite',
        'absol-mega' => 'absolite',
        'absol-mega-z' => 'absolite-z',
        'glalie-mega' => 'glalitite',
        'salamence-mega' => 'salamencite',
        'metagross-mega' => 'metagrossite',
        'latias-mega' => 'latiasite',
        'latios-mega' => 'latiosite',
        'staraptor-mega' => 'staraptite',
        'lopunny-mega' => 'lopunnite',
        'garchomp-mega' => 'garchompite',
        'garchomp-mega-z' => 'garchompite-z',
        'lucario-mega' => 'lucarionite',
        'lucario-mega-z' => 'lucarionite-z',
        'abomasnow-mega' => 'abomasite',
        'gallade-mega' => 'galladite',
        'froslass-mega' => 'froslassite',
        'heatran-mega' => 'heatranite',
        'darkrai-mega' => 'darkranite',
        'emboar-mega' => 'emboarite',
        'excadrill-mega' => 'excadrite',
        'audino-mega' => 'audinite',
        'scolipede-mega' => 'scolipite',
        'scrafty-mega' => 'scraftinite',
        'eelektross-mega' => 'eelektrossite',
        'chandelure-mega' => 'chandelurite',
        'golurk-mega' => 'golurkite',
        'chesnaught-mega' => 'chesnaughtite',
        'delphox-mega' => 'delphoxite',
        'greninja-mega' => 'greninjite',
        'pyroar-mega' => 'pyroarite',
        'floette-mega' => 'floettite',
        'meowstic-male-mega' => 'meowsticite',
        'meowstic-female-mega' => 'meowsticite',
        'malamar-mega' => 'malamarite',
        'barbaracle-mega' => 'barbaracite',
        'dragalge-mega' => 'dragalgite',
        'hawlucha-mega' => 'hawluchanite',
        'zygarde-mega' => 'zygardite',
        'diancie-mega' => 'diancite',
        'crabominable-mega' => 'crabominite',
        'golisopod-mega' => 'golisopite',
        'drampa-mega' => 'drampanite',
        'magearna-mega' => 'magearnite',
        'magearna-original-mega' => 'magearnite',
        'zeraora-mega' => 'zeraorite',
        'falinks-mega' => 'falinksite',
        'scovillain-mega' => 'scovillainite',
        'glimmora-mega' => 'glimmoranite',
        'tatsugiri-curly-mega' => 'tatsugirinite',
        'tatsugiri-droopy-mega' => 'tatsugirinite',
        'tatsugiri-stretchy-mega' => 'tatsugirinite',
        'baxcalibur-mega' => 'baxcalibrite',
    ],

    /*
     * As 25 naturezas (em Champions chamadas de "Stat Alignment"): +10% em
     * um stat e -10% em outro. As 5 neutras têm increased = decreased = null.
     */
    'natures' => [
        'hardy' => ['increased' => null, 'decreased' => null],
        'lonely' => ['increased' => 'attack', 'decreased' => 'defense'],
        'brave' => ['increased' => 'attack', 'decreased' => 'speed'],
        'adamant' => ['increased' => 'attack', 'decreased' => 'special-attack'],
        'naughty' => ['increased' => 'attack', 'decreased' => 'special-defense'],
        'bold' => ['increased' => 'defense', 'decreased' => 'attack'],
        'docile' => ['increased' => null, 'decreased' => null],
        'relaxed' => ['increased' => 'defense', 'decreased' => 'speed'],
        'impish' => ['increased' => 'defense', 'decreased' => 'special-attack'],
        'lax' => ['increased' => 'defense', 'decreased' => 'special-defense'],
        'timid' => ['increased' => 'speed', 'decreased' => 'attack'],
        'hasty' => ['increased' => 'speed', 'decreased' => 'defense'],
        'serious' => ['increased' => null, 'decreased' => null],
        'jolly' => ['increased' => 'speed', 'decreased' => 'special-attack'],
        'naive' => ['increased' => 'speed', 'decreased' => 'special-defense'],
        'modest' => ['increased' => 'special-attack', 'decreased' => 'attack'],
        'mild' => ['increased' => 'special-attack', 'decreased' => 'defense'],
        'quiet' => ['increased' => 'special-attack', 'decreased' => 'speed'],
        'bashful' => ['increased' => null, 'decreased' => null],
        'rash' => ['increased' => 'special-attack', 'decreased' => 'special-defense'],
        'calm' => ['increased' => 'special-defense', 'decreased' => 'attack'],
        'gentle' => ['increased' => 'special-defense', 'decreased' => 'defense'],
        'sassy' => ['increased' => 'special-defense', 'decreased' => 'speed'],
        'careful' => ['increased' => 'special-defense', 'decreased' => 'special-attack'],
        'quirky' => ['increased' => null, 'decreased' => null],
    ],

    'stats' => ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'],

];
