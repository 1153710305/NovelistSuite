/**
 * @file server/src/services/NotificationService.js
 * @description SSE 通知服务，用于实时推送任务更新
 */

class NotificationService {
    constructor() {
        this.clients = new Set();
    }

    /**
     * 添加客户端连接
     * @param {Response} res - Express 响应对象
     */
    addClient(res) {
        this.clients.add(res);
        // console.log(`[NotificationService] Client connected. Total: ${this.clients.size}`);

        // 发送初始连接成功消息
        res.write(`event: connected\ndata: {"message": "SSE Connected"}\n\n`);

        // 监听连接关闭
        res.on('close', () => {
            this.clients.delete(res);
            // console.log(`[NotificationService] Client disconnected. Total: ${this.clients.size}`);
        });
    }

    /**
     * 广播消息给所有客户端
     * @param {string} event - 事件名称 (e.g., 'task_update', 'log_update')
     * @param {Object} data - 数据载荷
     */
    broadcast(event, data) {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        this.clients.forEach(client => {
            try {
                client.write(message);
            } catch (e) {
                console.error('[NotificationService] Error sending message:', e);
                this.clients.delete(client);
            }
        });
    }
}

module.exports = new NotificationService();
