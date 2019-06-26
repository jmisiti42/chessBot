const SlackBot = require('slackbots');
const axios = require('axios');
const config = require('config');

const apiToken = config.get('api.token');
const botUserToken = config.get('bot.token');
const slackApi = config.get('urls.slack.api');

const bot = new SlackBot({
  token: botUserToken,
  name: 'Klox Bot',
});

const defaultChannel = {
  id: config.get('bot.channel.id'),
  name: config.get('bot.channel.name'),
}

let gameArray = new Array();

class Chess {
  constructor(bot, p1, p2) {
    this.board = [
      [':w_w_r:', ':b_w_k:', ':w_w_b:', ':b_w_king:', ':w_w_q:', ':b_w_b:', ':w_w_k:', ':b_w_r:',],
      [':b_w_p:', ':w_w_p:', ':b_w_p:', ':w_w_p:', ':b_w_p:', ':w_w_p:', ':b_w_p:', ':w_w_p:',],
      [':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:',],
      [':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:',],
      [':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:',],
      [':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:', ':black_cell:', ':white_cell:',],
      [':w_b_p:', ':b_b_p:', ':w_b_p:', ':b_b_p:', ':w_b_p:', ':b_b_p:', ':w_b_p:', ':b_b_p:',],
      [':b_b_r:', ':w_b_k:', ':b_b_b:', ':w_b_king:', ':b_b_q:', ':w_b_b:', ':b_b_k:', ':w_b_r:',],
    ];
    this.chars = ['a', 'b', 'c', 'd']
    this.white = p1;
    this.black = p2;
    this.bot = bot;
    this.readyCounter = 0;
    this.channel = null;
    this.gameStarted = false;
    this.askStart();
  };

  changeReadyCounter(type) {
    switch (type) {
      case 'removed':
        this.readyCounter--;
        break;
      case 'added':
        this.readyCounter++;
        break;
      default:
        break;
    }
    if (this.readyCounter >= 3) {
      this.gameStarted = true;
      this.printBoard();
    }
  }

  async askStart() {
    let res;
    res = await axios.post(`${slackApi}/conversations.open?token=${botUserToken}&users=${this.white.id},${this.black.id}`);
    this.channel = res.data.channel;
    gameArray[this.channel.id] = this;
    const msg = `${this.white.name} wan't to fight against ${this.black.name}. Are you ready ?`
    res = await axios.post(`${slackApi}/chat.postMessage?token=${botUserToken}&channel=${this.channel.id}&as_user=true&text=${msg}`);
    const timestamp = res.data.ts;
    await axios.post(`${slackApi}/reactions.add?token=${botUserToken}&name=white_check_mark&channel=${this.channel.id}&timestamp=${timestamp}`);
  };

  printBoard(i = 0) {
    this.bot.postMessageToGroup(this.channel.name, `${this.board[i].join(' ')}:${i + 1}_cell:`, null, () => {
      if (i < 7) {
        this.printBoard(++i);
      } else if (i == 7) {
        this.bot.postMessageToGroup(this.channel.name, ':a_cell: :b_cell: :c_cell: :d_cell: :e_cell: :f_cell: :g_cell: :h_cell:');
      }
    });
  };
}

bot.on('message', async (res) => {
  if (res.type == 'message' && !res.subtype) {
    const { text, user, channel } = res;
    const usr = await bot.getUserById(user);
    if (text.indexOf('chess start') > -1 && channel === defaultChannel.id) {
      if (text.split('@').length !== 2)
        await bot.postMessageToGroup(defaultChannel.name, 'Wrong usage !, try `chess start @player2`.');
      else {
        const player2id = text.split('@')[1].split('>')[0];
        const player1 = usr;
        const player2 = await bot.getUserById(player2id);
        new Chess(bot, player1, player2);
      }
    }
  } else if (res.type.indexOf('reaction') > -1 && !res.subtype && res.reaction == 'white_check_mark') {
    const chess = gameArray[res.item.channel];
    if (chess && chess.gameStarted == false) {
      chess.changeReadyCounter(res.type.split('_')[1]);
    }
  }
});