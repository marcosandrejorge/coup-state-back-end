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

let arrSalas = [];
let arrJogadores = [];
let arrAcoesSala = [];

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

function getJogadoresDaSala(hashSala) {
    return arrJogadores.filter(jogador => {
        return jogador.hashSala == hashSala;
    })
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
}

function atualizarCartasDeTodos(hashSala) {
    let jogadoresSala = getJogadoresDaSala(hashSala);

    jogadoresSala.map(jogador => {
        atualizarCartaJogador(jogador.idJogador); 
    });
}

function atualizarCartaJogador(idJogador) {
    let cartasJogador = arrCartasJogo.filter(carta => {
        return carta.idJogador == idJogador
    });

    io.to(idJogador).emit('minhasCartas', cartasJogador);
}

function iniciarPartida(hashSala) {
    let objSala = getObjSala(hashSala);

    let quantidadeJogadores = objSala.quantidadeJogadores;

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

io.on('connection', socket => {
    socket.emit('socketId', socket.id);
    io.emit('salasAtualizadas', arrSalas);

    function emitJogadores(hashSala) {
        // enviar para todos os clientes em uma sala específica
        atualizarQuantidadeJogadores(hashSala);
        io.in(hashSala).emit('jogadoresAtualizado', getJogadoresDaSala(hashSala));
        //Atualiza o jogador que está logado no socket.
        socket.emit('atualizarJogadorLogado', getObjJogador(socket.id))
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
            isBloqueadoJogar: true,
            isJogando: false,
            qtdMoedas: 2,
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

        io.emit('salasAtualizadas', arrSalas);
        socket.emit('salaCriada', hashSala);
    });

    socket.on('iniciarPartida', () => {
        //Recupera o hash da sala que o usuário está conectado.
        let hashSala = getHashSalaJogador(socket.id);

        //Verifica se o usuário é mesmo o admin da sala e se a sala não foi iniciada ainda.
        if (!isAdmin(socket.id, hashSala) || isSalaIniciada(hashSala)) return;

        alterarStatusSala(hashSala, true);

        adicionarAcaoSala(
            `Partida iniciada`,
            hashSala
        );

        iniciarPartida(hashSala);
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