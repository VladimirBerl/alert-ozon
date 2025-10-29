import { ADMINS } from '~/config/admins.js';
import { bot } from '~/index.js';

interface Timeslot {
  from_in_timezone: string;
  to_in_timezone: string;
}

export class AdminNotifier {
  private admins: number[];

  constructor(admins = ADMINS) {
    this.admins = admins;
  }

  private async sendToAll(message: string, parseMode: 'HTML' | 'MarkdownV2' = 'HTML') {
    if (!this.admins.length) {
      console.warn('⚠️ Нет администраторов для уведомления');
      return;
    }

    for (const adminId of this.admins) {
      try {
        await bot.telegram.sendMessage(adminId, message, { parse_mode: parseMode });
      } catch (err) {
        console.error(`❌ Не удалось отправить сообщение админу ${adminId}:`, err);
      }
    }

    console.log(`📢 Сообщение отправлено ${this.admins.length} администраторам`);
  }

  /**
   * Уведомление о успешном создании заявки
   */
  async notifyDraftCreated(operation_id: string | number, draft_id: number, timeslot: Timeslot) {
    const message = [
      `✅ <b>Заявка успешно создана!</b>`,
      ``,
      `🆔 <b>Operation ID:</b> ${operation_id}`,
      `📦 <b>Draft ID:</b> ${draft_id}`,
      `🕒 <b>Таймслот:</b> ${timeslot.from_in_timezone} → ${timeslot.to_in_timezone}`,
      ``,
      `Мониторинг автоматически остановлен.`,
    ].join('\n');

    await this.sendToAll(message);
  }

  /**
   * Уведомление о превышении лимита запросов (429)
   */
  async notifyRateLimitExceeded(errorMessage: string) {
    const message = [
      `⚠️ <b>Превышен лимит создания черновиков!</b>`,
      ``,
      `🕐 Время: ${new Date().toLocaleString('ru-RU')}`,
      `💬 Сообщение API: <code>${errorMessage}</code>`,
      ``,
      `Рекомендуется подождать 1–2 минуты перед следующей попыткой.`,
    ].join('\n');

    await this.sendToAll(message);
  }

  /**
   * Универсальное уведомление об ошибках
   */
  async notifyError(context: string, error: unknown) {
    const message = [
      `❌ <b>Ошибка:</b> ${context}`,
      ``,
      `<pre>${error instanceof Error ? error.message : String(error)}</pre>`,
    ].join('\n');

    await this.sendToAll(message);
  }
}
