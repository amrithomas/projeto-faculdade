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
