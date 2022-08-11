const puppeteer = require("puppeteer");
const { Telegraf } = require("telegraf");
const config = require("./config.json");
const fs = require("fs");
const schedule = require("node-schedule");
const app = new Telegraf(config.token);
const regions = require("./regions.json");


//! ============================================================
let file = fs.readFileSync(__dirname + `/screen/dashboard.png`);
//! ============================================================

try {
  (async () => {
    const browser = await puppeteer.launch();
    const globalView = await browser.newPage();
    //! === Auth ==== //!
    await globalView.setViewport({
      width: 2300,
      height: 1600,
      deviceScaleFactor: 1,
    });
    await globalView.goto(`${config.ip}/index.php`);
    await globalView.evaluate(async () => {
      let login = config.login;
      let password = config.password;
      document.querySelector("#name").value = login;
      document.querySelector("#password").value = password;
      document.querySelector("button[type=submit]").click();
    });
    await globalView.waitForTimeout(2000);
    //!! ==================================================
    await globalView.goto(`${config.ip}/zabbix.php?action=dashboard.view`);
    await globalView.waitForTimeout(2000);
    await globalView.screenshot({ path: `screen/dashboard.png` });
    console.log("Screenshot update");
    await globalView.waitForTimeout(2000);

    let capText;

    setInterval(async () => {
      await globalView.goto(`${config.ip}/zabbix.php?action=dashboard.view`);

      await globalView.waitForTimeout(2000);
      await globalView.screenshot({ path: `screen/dashboard.png` });
      await globalView.waitForTimeout(2000);
      file = fs.readFileSync(__dirname + `/screen/dashboard.png`);

      console.log(`[LOGS]-[EVENT LOOP]: Screen update!`);
      capText = "";

      const errorZabbix = await globalView.evaluate(async () => {
        try {
          let getElement = document
            .querySelectorAll("tbody")[0]
            .querySelectorAll("tr");
          if (getElement.length == 0) {
            return undefined;
          }
          let errDate = [];
          let errRegion = [];
          getElement.forEach((el) => {
            if ([el][0].className == "hover-nobg") {
              return console.log("time fix");
            }

            if ([el.querySelectorAll("td")][0].length >= 10) {
              if ([el.querySelectorAll("td")][0][7].className == "high-bg") {
                if ([el.querySelector("td")][0].className == "timeline-date") {
                  errDate.push(`🔴 ${[el.querySelector("td")][0].innerText}`); // Date
                }
              } else if (
                [el.querySelectorAll("td")][0][7].className == "warning-bg"
              ) {
                if ([el.querySelector("td")][0].className == "timeline-date") {
                  errDate.push(`🟠 ${[el.querySelector("td")][0].innerText}`); // Date
                }
              }
            }
            if ([el.querySelector("td")][0].className !== "timeline-date") {
              errRegion.push([el.querySelector("td")][0].innerHTML); // Regions
            }
          });
          let errorList = {
            errDate,
            errRegion,
          };
          return errorList;
        } catch (error) {
          console.log(error);
        }
      });

      console.log(errorZabbix);

      if (errorZabbix.errRegion[0] == "Данные не найдены.") {
        capText = "🟢 Ошибок нет";
      } else if (errorZabbix.errDate.length > 1) {
        errorZabbix.errRegion.forEach((errDate, index) => {
          capText += `${errorZabbix.errDate[index]} - ${
            regions[errorZabbix.errRegion[index]]
          }\n`;
        });
      } else {
        capText = ` ${errorZabbix["errDate"][0]} - ${
          regions[errorZabbix["errRegion"][0]]
        }\n`;
      }
      console.log(`[LOGS] - [EVENT LOOP] - [REP/WAR] : ${capText}`);
    }, 20000);

    // ! График отправки сообщений Zubbix

    let grafMorn = new schedule.RecurrenceRule();
    grafMorn.dayOfWeek = [1, 2, 3, 4, 5];
    grafMorn.hour = 9;
    grafMorn.minute = 9;

    let grafNight = new schedule.RecurrenceRule();
    grafNight.dayOfWeek = [1, 2, 3, 4, 5];
    grafNight.hour = 19;
    grafNight.minute = 50;

    //!! ===================================

    schedule.scheduleJob(grafNight, async function () {
      await globalView.screenshot({ path: `screen/dashboard.png` });
      file = fs.readFileSync(__dirname + `/screen/dashboard.png`);
      await globalView.waitForTimeout(2000);
      console.log(`[LOGS]: Выгрузка заббикс [Night].`);
      app.telegram.sendDocument(
        log_channel_id,
        {
          source: file,
          filename: `zabbix ${new Date()
            .toJSON()
            .slice(
              0,
              10
            )} ${new Date().getHours()}.${new Date().getMinutes()}.png`,
        },
        { caption: capText }
      );
    });

    schedule.scheduleJob(grafMorn, async function () {
      await globalView.screenshot({ path: `screen/dashboard.png` });
      file = fs.readFileSync(__dirname + `/screen/dashboard.png`);
      await globalView.waitForTimeout(2000);
      console.log(`[LOGS]: Выгрузка заббикс [Morn].`);
      app.telegram.sendDocument(
        log_channel_id,
        {
          source: file,
          filename: `zabbix ${new Date()
            .toJSON()
            .slice(
              0,
              10
            )} ${new Date().getHours()}.${new Date().getMinutes()}.png`,
        },
        { caption: capText }
      );
    });

    // Отправить скрин из папки НЕМЕДЛЕННО
    app.command("zabbix", async (msg) => {
      file = fs.readFileSync(__dirname + `/screen/dashboard.png`);
      app.telegram.sendDocument(
        msg.message.chat.id,
        {
          source: file,
          filename: `zabbix ${new Date()
            .toJSON()
            .slice(
              0,
              10
            )} ${new Date().getHours()}.${new Date().getMinutes()}.png`,
        },
        { caption: capText }
      );
    });

    // Получить ID чата
    app.command("getID", async (msg) => {
      if (msg.message.from.id !== 456971837) {
        return msg.reply(
          "У Вас не достаточно прав для использования данной командой."
        );
      }
      msg.reply(msg.message.chat.id);
    });
    app.launch().then(() => console.log("bot is working"));
  })();
} catch (error) {
  console.log(error);
}
