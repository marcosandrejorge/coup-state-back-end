const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'src')));
app.set('views', path.join(__dirname, 'src'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html');
});

/**
 * Ações
 */
const UMA_MOEDA = 1;
const AJUDA_EXTERNA = 2;
const TAXA = 3;
const ASSASSINAR = 4;
const EXTORQUIR = 5;
const DEFENDER = 6;
const CONTESTAR = 7;
const GOLPE_ESTADO = 8;
const ACEITAR = 9;
const INVESTIGAR = 10;
const TROCAR_CARTA = 11;

/**
 * Cartas
 */

const REI = 1;
const MAJOR = 2;
const DAMA = 3;
const MATADOR = 4;
const JUIZ = 5;

const arrAcoesEmOutrosJogadores = [
    ASSASSINAR,
    EXTORQUIR,
    GOLPE_ESTADO,
    INVESTIGAR
];

const arrAcoesParaAceitar = [
    AJUDA_EXTERNA,
    TAXA,
    TROCAR_CARTA
];

const arrTiposAceites = [
    CONTESTAR,
    ACEITAR
]

let arrSalas = [];
let arrJogadores = [];
let arrAcoesSala = [];
let arrSalasJogadorVez = [];
let arrAcoesASeremAceitas = [];

let arrTiposCartas = [
    {
        idCarta: 1,
        idJogador: null,
        sn_ativa: true
    },
    {
        idCarta: 2,
        idJogador: null,
        sn_ativa: true
    },
    {
        idCarta: 3,
        idJogador: null,
        sn_ativa: true
    },
    {
        idCarta: 4,
        idJogador: null,
        sn_ativa: true
    },
    {
        idCarta: 5,
        idJogador: null,
        sn_ativa: true
    },
];

let arrCartasJogo = [];
//O jogo possui 5 personagens básicos e o Inquisidor. 
//Para jogos com até 6 jogadores são utilizados 3 cópias de cada um dos personagens. 
//Caso deseje jogar com o Inquisidor, substitua ele pelo Embaixador. Em jogos com 7 ou 8 jogadores, utilize 4 cópias. Em 9 ou 10, 5 cópias dos personagens.

function gerarHashSala() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 15; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getHashSalaJogador(idJogador) {
    let sala = arrJogadores.find(jogador => {
        return jogador.idJogador == idJogador
    });

    return sala == null ? null : sala.hashSala;
}

function getObjSala(hashSala) {
    return arrSalas.find(sala => {
        return sala.hashSala == hashSala
    })
}

function getDescricaoAcao(idAcao) {
    switch (idAcao) {
        case ASSASSINAR:
            return 'Ele quer te assassinar'
            break;
        case EXTORQUIR:
            return 'Ele quer extorquir 2 moedas suas'
            break;
        case GOLPE_ESTADO:
            return 'Ele quer te matar com GOLPE DE ESTADO'
            break;
        case INVESTIGAR:
            return 'Ele quer investigar suas cartas'
            break;
    }
}

function getNomeAcao(idAcao) {
    switch (idAcao) {
        case ASSASSINAR:
            return 'ASSASSINAR'
            break;
        case EXTORQUIR:
            return 'EXTORQUIR'
            break;
        case GOLPE_ESTADO:
            return 'GOLPE DE ESTADO'
            break;
        case INVESTIGAR:
            return 'INVESTIGAR'
            break;
        case TAXA:
            return 'TAXA'
            break;
        case TROCAR_CARTA:
            return 'TROCAR CARTA'
            break;
        case AJUDA_EXTERNA:
            return 'AJUDA EXTERNA'
            break;
    }
}

function getPodeDefenderDaAcao(idAcao) {
    return idAcao == GOLPE_ESTADO ? false : true;
}

function getJogadoresDaSala(hashSala) {
    return arrJogadores.filter(jogador => {
        return jogador.hashSala == hashSala;
    })
}

function atualizarJogadoresSala(hashSala) {
    io.in(hashSala).emit('jogadoresAtualizado', getJogadoresDaSala(hashSala));
}

function atualizaMoedasJogador(idJogador, moedasAdicionar = 0, moedasSubtrair = 0) {
    let hashSalaJogador = "";
    arrJogadores.map(jogador => {
        if (jogador.idJogador == idJogador) {
            jogador.qtdMoedas += moedasAdicionar;
            jogador.qtdMoedas -= moedasSubtrair;
            hashSalaJogador = jogador.hashSala;
        }
    });

    atualizarObjJogador(idJogador);
    atualizarJogadoresSala(hashSalaJogador);
}

function atualizarObjJogador(idJogador) {
    io.to(idJogador).emit('atualizarJogadorLogado', getObjJogador(idJogador));
}

function atualizarQuantidadeJogadores(hashSala) {
    arrSalas.map(sala => {
        if (sala.hashSala == hashSala) {
            sala.quantidadeJogadores = getJogadoresDaSala(hashSala).length
        }
    });

    io.emit('salasAtualizadas', arrSalas);
}

function getObjJogador(idJogador) {
    return arrJogadores.find(jogador => {
        return jogador.idJogador == idJogador
    })
}

function isAdmin(idJogador, hashSala) {
    return arrSalas.filter(sala => {
        return sala.hashSala == hashSala && sala.admin == idJogador
    }).length > 0
}

function alterarStatusSala(hashSala, isSalaIniciada) {
    arrSalas.map(sala => {
        if (sala.hashSala == hashSala) {
            sala.isSalaIniciada = isSalaIniciada
        }
    })

    io.emit('salasAtualizadas', arrSalas);
    io.in(hashSala).emit('salaConectada', getObjSala(hashSala));
}

function emitMensagemUsuario(idJogador, mensagem, tipo) {
    io.to(idJogador).emit('mensagem', {
        mensagem,
        tipo
    });
}

function emitMensagemSala(hashSala, mensagem, tipo = "") {
    io.in(hashSala).emit('mensagem', {
        mensagem,
        tipo
    });
}

function isSalaIniciada(hashSala) {
    return getObjSala(hashSala).isSalaIniciada
}

function isSalaExiste(hashSala) {
    return getObjSala(hashSala) !== null
}

function isExisteVagasSala(hashSala) {
    return getJogadoresDaSala(hashSala).length < 10
}

function distribuirCartas(hashSala, quantidadeCadaCarta) {
    let arrCartas = [];
    arrCartasJogo = [];
    for (let index = 0; index < quantidadeCadaCarta; index++) {
        arrCartas = [...arrTiposCartas, ...arrCartas];
    }

    arrCartas.map(carta => {
        arrCartasJogo.push({ ...carta})
    });

    let jogadoresSala = getJogadoresDaSala(hashSala);

    //Percorre cada jogador da sala e dá 2 cartas pra cada.
    jogadoresSala.map(jogador => {
        for (let index = 0; index < 2;) {
            let cartasDisponiveis = arrCartasJogo.filter( carta => carta.idJogador == null);
            let numeroCarta = Math.floor(Math.random() * cartasDisponiveis.length);

            if (arrCartasJogo[numeroCarta].idJogador == null) {
                arrCartasJogo[numeroCarta].idJogador = jogador.idJogador;
                index++;
            }
        }
    });

    atualizarCartasDeTodos(hashSala);
    atualizarJogadorDaVez(hashSala);
}

function atualizarCartasDeTodos(hashSala) {
    let jogadoresSala = getJogadoresDaSala(hashSala);

    jogadoresSala.map(jogador => {
        atualizarCartaJogador(jogador.idJogador); 
    });

    atualizarJogadoresSala(hashSala);
}

function atualizarCartaJogador(idJogador) {
    let cartasJogador = arrCartasJogo.filter(carta => {
        return carta.idJogador == idJogador
    });

    arrJogadores.map(jogador => {
        if (jogador.idJogador == idJogador) {
            jogador.arrCartas = [];
            cartasJogador.map(carta => {
                jogador.arrCartas.push({
                    idCarta: carta.sn_ativa ? null : carta.idCarta,
                    sn_ativa: carta.sn_ativa
                });
            });
        }
    });

    io.to(idJogador).emit('minhasCartas', cartasJogador);
}

/**
 * Verifica qual é o jogador da vez da sala
 * @param {*} hashSala Sala a ser verifica qual é o jogador da vez
 * @param {*} idJogador Id do jogador que foi o ultimo a jogar na sala
 */
function atualizarJogadorDaVez(hashSala) {

    if (!isSalaIniciada(hashSala)) return;

    //Recupera o ultimo jogador a jogar da sala.
    let idJogadorUltimoJogar = arrSalasJogadorVez.filter( sala => {
        return sala.hashSala == hashSala
    });

    //Se idJogadorUltimoJogar é igual a 0, quer dizer que é o primeiro jogador a jogar, logo depois da partida iniciar.
    if (idJogadorUltimoJogar.length > 0) {
        idJogadorUltimoJogar = idJogadorUltimoJogar[0].idJogadorVez;
    } else {
        idJogadorUltimoJogar = null
    }

    let jogadorVez = getProximoJogador(hashSala, idJogadorUltimoJogar);

    //Atualiza o array com o jogador da vez
    arrSalasJogadorVez.map(sala => {
        sala.idJogadorVez = jogadorVez.idJogador
    });

    adicionarAcaoSala(
        `É a vez de ${jogadorVez.username} jogar`,
        hashSala
    );

    io.to(jogadorVez.idJogador).emit('suaVezDeJogar');
}

function getProximoJogador(hashSala, idJogadorUltimoJogar) {
    let posicaoProximoJogador = null;
    let jogadoresSala = getJogadoresDaSala(hashSala);

    //Se o idJogadorUltimoJogar é igual a null, quer dizer que é a primeira rodado do jogo.
    //Primeira rodada, começa pelo primeiro jogador da sala.
    if (idJogadorUltimoJogar == null) {
        return jogadoresSala[0];
    }

    let posicaoUltimoJogador = jogadoresSala.map(x => x.idJogador).indexOf(idJogadorUltimoJogar);

    //Se o ultimo jogador é o ultimo do array, volta pro primeiro.
    if ((posicaoUltimoJogador + 1) == jogadoresSala.length) {
        posicaoProximoJogador = 0;
    } else {
        posicaoProximoJogador = posicaoUltimoJogador + 1;
    }

    //Verifica se o jogador ainda está jogando, se não estiver, pula para o proximo.
    if (!jogadoresSala[posicaoProximoJogador].isJogando) {
        return getProximoJogador(hashSala, jogadoresSala[posicaoProximoJogador].idJogador);
    }

    return jogadoresSala[posicaoProximoJogador];
}

function iniciarPartida(hashSala) {
    let objSala = getObjSala(hashSala);

    let quantidadeJogadores = objSala.quantidadeJogadores;

    //Coloca todos jogadores da sala ativos para jogar.
    arrJogadores.map(jogador => {
        if (jogador.hashSala == hashSala) {
            jogador.isJogando = true;
        }
    })

    atualizarJogadoresSala(hashSala);

    if (quantidadeJogadores <= 6) {
        distribuirCartas(hashSala, 3);
        return;
    }

    if (quantidadeJogadores > 6 && quantidadeJogadores <= 8) {
        distribuirCartas(hashSala, 4);
        return;
    }

    if (quantidadeJogadores > 8) {
        distribuirCartas(hashSala, 5);
        return;
    }
}

function adicionarAcaoSala(acao, hashSala) {
    arrAcoesSala.push({
        acao,
        hashSala
    });

    io.in(hashSala).emit('acoesSala', getAcoesSala(hashSala));
}

function getAcoesSala(hashSala) {
    return arrAcoesSala.filter(acao => {
        return acao.hashSala == hashSala
    }).map(x => x.acao );
}

function temMoedasParaJogada(idAcao, idJogador) {
    let qtdMoedasParaAcao = 0;

    switch (idAcao) {
        case ASSASSINAR:
            qtdMoedasParaAcao = 3;
            break;
        case GOLPE_ESTADO:
            qtdMoedasParaAcao = 7;
            break;
    }

    return getObjJogador(idJogador).qtdMoedas >= qtdMoedasParaAcao;
}

/**
 * Remove da fila de ações a serem aceitas a ação da sala hashSala
 * @param {*} hashSala 
 */
function removerAcaoASerAceita(hashSala) {
    let indexSala = null;

    arrAcoesASeremAceitas.map((acao, index) => {
        if (acao.hashSala == hashSala) {
            indexSala = index;
        }
    });

    if (indexSala !== null) {
        arrAcoesASeremAceitas.splice(indexSala, 1);
    }
}

/**
 * Retorna se a sala em questão tem uma ação pendente para ser aceita
 * @param {*} hashSala 
 */
function existeAcaoASerAceitaSala(hashSala) {
    return arrAcoesASeremAceitas.filter(acao => {
        return acao.hashSala == hashSala
    }).length > 0;
}

function concluirJogadaPendente(hashSala) {
    let objJogadaPendente = arrAcoesASeremAceitas.filter(acao => {
        return acao.hashSala == hashSala
    })[0];

    if (objJogadaPendente.idAcao == AJUDA_EXTERNA || objJogadaPendente.idAcao == TAXA) {

        adicionarAcaoSala(
            `${objJogadaPendente.usernameQuemJogou} executou a ação de: ${getNomeAcao(objJogadaPendente.idAcao)}`,
            hashSala
        );
        let qtdMoedas = objJogadaPendente.idAcao == AJUDA_EXTERNA ? 2 : 3;
        atualizaMoedasJogador(objJogadaPendente.idJogador, qtdMoedas);
        return;
    }

    if (objJogadaPendente.idAcao == TROCAR_CARTA) {
        //TODO IMPLEMENTAR A TROCA DE CARTA
    }
}

function aceitarJogada(hashSala) {

    let qtdAceite = 0;

    arrAcoesASeremAceitas.map(acao => {
        if (acao.hashSala == hashSala) {
            acao.qtdAceite++;
            qtdAceite = acao.qtdAceite;
        }
    });

    //Verifica se todos já aceitaram a jogada, se todos aceitaram pula para o proximo jogador
    let qtd_jogadores_sala = getJogadoresDaSala(hashSala).length;

    //Jogada aprovada
    //qtdAceite sempre vai ter o número de jogadores menos 1 que foi o que executou a ação
    if (qtd_jogadores_sala == (qtdAceite + 1)) {
        concluirJogadaPendente(hashSala);
        removerAcaoASerAceita(hashSala);
        atualizarJogadorDaVez(hashSala);
    }
}

function realizarJogada(objAcao, socket) {
    let idJogador = socket.id;
    let hashSala = getHashSalaJogador(idJogador);

    if (!isSalaIniciada(hashSala)) return;

    //Valida se a sala da ação tem uma ação pendente de resposta, se tiver só deixar as ações de ACEITAR e CONTESTAR
    if (existeAcaoASerAceitaSala(hashSala) && arrTiposAceites.indexOf(objAcao.idAcao) == -1) {
        return;
    }

    if (!temMoedasParaJogada(objAcao.idAcao, idJogador)) {
        atualizarJogadorDaVez(hashSala);
        return;
    }

    //Verifica se a ação escolhida é uma ação de ataque, se for, envia uma notificação para o jogador aceitar o ataque ou não.
    if (arrAcoesEmOutrosJogadores.indexOf(objAcao.idAcao) != -1) {
        //Emit uma notificação pro jogador atacado
        io.to(objAcao.idJogadorAtacado).emit('ataqueRecebido', {
            title: `O jogador ${objAcao.usernameQuemJogou} atacou você`,
            descricaoAcao: getDescricaoAcao(objAcao.idAcao),
            idJogadorQueAtacou: idJogador,
            usernameQueAtacou: objAcao.usernameQuemJogou,
            idAcaoRecebida: objAcao.idAcao,
            mostrarAcaoDefesa: getPodeDefenderDaAcao(objAcao.idAcao)
        });

        adicionarAcaoSala(
            `${objAcao.usernameQuemJogou} atacou o jogador ${objAcao.usernameJogadorAtacado} com a ação de: ${getNomeAcao(objAcao.idAcao)}`,
            hashSala
        );

        return;
    }

    //Se é uma ação que precisa ser aceita pelos outros jogadores, dá um tempo para aceitarem ou contestarem
    if (arrAcoesParaAceitar.indexOf(objAcao.idAcao) != -1) {
        socket.broadcast.to(hashSala).emit('aguardarRespostaJogada', {
            title: `O jogador ${objAcao.usernameQuemJogou} quer efetuar a jogada de: ${getNomeAcao(objAcao.idAcao)}`,
            descricaoAcao: getDescricaoAcao(objAcao.idAcao),
            idJogadorQueJogou: idJogador,
            usernameQueJogou: objAcao.usernameQuemJogou,
            idAcaoJogada: objAcao.idAcao,
            isResponderJogada: true
        });

        arrAcoesASeremAceitas.push({
            hashSala: hashSala,
            idAcao: objAcao.idAcao,
            idJogador: idJogador,
            usernameQuemJogou: objAcao.usernameQuemJogou,
            qtdAceite: 0
        });

        return;
    }

    if (objAcao.idAcao == ACEITAR) {
        aceitarJogada(hashSala);
        return;
    }

    if (objAcao.idAcao == UMA_MOEDA) {
        adicionarAcaoSala(
            `${objAcao.usernameQuemJogou} executou a ação de: ${getNomeAcao(objAcao.idAcao)}`,
            hashSala
        );
        atualizaMoedasJogador(idJogador, 1);
    }

    atualizarJogadorDaVez(hashSala);
};

function verificarFimDeJogo(hashSala) {
    let jogadoresJogando = getJogadoresDaSala(hashSala).filter(jogador => jogador.isJogando);
    let jogadorVencedor = null;

    if (jogadoresJogando.length > 1) {
        return;
    }

    jogadorVencedor = jogadoresJogando[0];

    alterarStatusSala(hashSala, false);

    emitMensagemSala(
        hashSala,
        `VENCEDOR: ${jogadorVencedor.username}`,
        'fim_de_jogo'
    );
}

io.on('connection', socket => {
    socket.emit('socketId', socket.id);
    io.emit('salasAtualizadas', arrSalas);

    function emitJogadores(hashSala) {
        // enviar para todos os clientes em uma sala específica
        atualizarQuantidadeJogadores(hashSala);
        atualizarJogadoresSala(hashSala);
        //Atualiza o jogador que está logado no socket.
        socket.emit('atualizarJogadorLogado', getObjJogador(socket.id));
    }

    //Função para adicionar no arrJogadores. Responsavel pelo controle para saber qual jogador está em qual sala.
    function adicionarJogadorESala(hashSala, idJogador, username) {

        if (isSalaIniciada(hashSala) || !isSalaExiste(hashSala) || !isExisteVagasSala(hashSala)) {
            emitMensagemUsuario(
                idJogador,
                'Não é possível conectar a sala',
                'redirect'
            );
            return;
        }

        //Se encontrar o jogador conectado a alguma sala, para por aqui.
        if (getHashSalaJogador(idJogador) !== null) return;

        arrJogadores.push({
            idJogador: idJogador,
            username: username,
            hashSala: hashSala,
            isJogando: false,
            qtdMoedas: 2,
            arrCartas: []
        });

        socket.join(hashSala);
        socket.emit('salaConectada', getObjSala(hashSala));

        adicionarAcaoSala(
            `${username} entrou na sala`,
            hashSala
        );

        emitJogadores(hashSala);
    }

    function removerJogadorSala(idJogador) {
        let index = null;
        let hashSala = null;
        let username = null;

        arrJogadores.map((jogador, key) => {
            if (jogador.idJogador == idJogador) {
                index = key;
                hashSala = jogador.hashSala;
                username = jogador.username;
            }
        });

        if (index !== null) {

            socket.leave(getHashSalaJogador(idJogador));

            arrJogadores.splice(index, 1);
            // enviar para todos os clientes em uma sala específica
            alterarAdminDaSala(idJogador, hashSala);
            emitJogadores(hashSala);

            adicionarAcaoSala(
                `${username} saiu da sala`,
                hashSala
            );

            verificarFimDeJogo(hashSala);
        }
    };

    //Função que troca o admin da sala, caso o jogador que saiu for o admin da sala.
    function alterarAdminDaSala(idJogador) {
        let removerSala = false;
        let index = null;
        let hashSala = null;

        arrSalas.map((sala, key) => {
            if (sala.admin == idJogador) {
                let jogadores = getJogadoresDaSala(sala.hashSala);

                //Se não tem mais ninguém na sala, remove ela.
                removerSala = jogadores.length == 0;
                index = key;

                if (!removerSala) {
                    sala.admin = jogadores[0].idJogador;
                    sala.adminUserName = jogadores[0].username;
                    hashSala = sala.hashSala
                }
            }
        });

        if (removerSala) {
            arrSalas.splice(index, 1);
        }

        io.emit('salasAtualizadas', arrSalas);

        //Se não é para remover a sala, atualiza o objSala de todos os usuários da sala para que recebebam a alteração do admin da sala.
        if (!removerSala) {
            io.in(hashSala).emit('salaConectada', getObjSala(hashSala));
        }
    }

    socket.on('criarSala', data => {
        //Entra com o usuário na sala selecionada;
        let hashSala = gerarHashSala();

        let objSala = {
            hashSala: hashSala,
            quantidadeJogadores: 1,
            isSalaIniciada: false,
            admin: socket.id,
            adminUserName: data.username
        };

        arrSalas.push(objSala);

        arrSalasJogadorVez.push({
            hashSala: hashSala,
            idJogadorVez: null
        });

        io.emit('salasAtualizadas', arrSalas);
        socket.emit('salaCriada', hashSala);
    });

    socket.on('iniciarPartida', () => {
        //Recupera o hash da sala que o usuário está conectado.
        let hashSala = getHashSalaJogador(socket.id);
        let qtdJogadores = getJogadoresDaSala(hashSala).length;

        //Verifica se o usuário é mesmo o admin da sala, se a sala não foi iniciada ainda ou se tem jogadores o suficientes para jogar
        if (!isAdmin(socket.id, hashSala) || isSalaIniciada(hashSala) || qtdJogadores == 1) return;

        alterarStatusSala(hashSala, true);

        adicionarAcaoSala(
            `Partida iniciada`,
            hashSala
        );

        iniciarPartida(hashSala);
    });

    socket.on('acaoRealizar', objAcao => {
        realizarJogada(objAcao, socket);
    });

    socket.on('acaoDefesaRealizar', objAcaoDefesa => {
        //console.log(objAcaoDefesa);
    });

    socket.on('entrarSala', data => {
        adicionarJogadorESala(data.hashSala, socket.id, data.username);
    });

    socket.on('sairSala', () => {
        removerJogadorSala(socket.id);
    });

    socket.on('disconnect', () => {
        removerJogadorSala(socket.id);
    });
});

server.listen(3000);