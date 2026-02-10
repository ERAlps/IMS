<?php
/**
 * 智库 IMS - 全方位系统诊断工具
 */
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'config.php';

echo "<html><head><title>系统修复中心</title><style>
    body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
    .card { background: #1e293b; padding: 30px; border-radius: 24px; border: 1px solid #334155; margin-bottom: 24px; }
    h1 { color: #38bdf8; }
    .status { font-weight: bold; padding: 4px 12px; border-radius: 99px; font-size: 0.8em; }
    .ok { background: #064e3b; color: #34d399; }
    .fail { background: #450a0a; color: #f87171; }
    .btn { background: #38bdf8; color: #0f172a; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 900; }
    pre { background: #000; padding: 15px; border-radius: 8px; font-size: 0.8em; }
</style></head><body>";

echo "<h1>环境诊断中心</h1>";

if (isset($_POST['fix']) && $pdo) {
    try {
        echo "<div class='card'><h3>执行中...</h3><pre>";
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, password VARCHAR(255), role VARCHAR(20))");
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            $pass = password_hash('admin123', PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'Admin')")->execute([$pass]);
            echo "✅ 默认管理员已重置 (admin / admin123)\n";
        }
        echo "✅ 核心表结构检查完成\n";
        echo "</pre></div>";
    } catch (Exception $e) {
        echo "<div class='card fail'>错误: " . $e->getMessage() . "</div>";
    }
}

echo "<div class='card'><h3>实时状态</h3><ul>";
if ($pdo) {
    echo "<li>数据库连接: <span class='status ok'>正常</span></li>";
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        echo "<li>资产数据量: <span class='status ok'>$count 条记录</span></li>";
    } catch (Exception $e) {
        echo "<li>资产表状态: <span class='status fail'>异常 (需执行修复)</span></li>";
    }
} else {
    echo "<li>数据库连接: <span class='status fail'>失败</span></li>";
    if (isset($pdo_error)) echo "<li class='fail'>错误信息: $pdo_error</li>";
}
echo "</ul>";

if ($pdo) {
    echo "<form method='post'><button type='submit' name='fix' class='btn'>一键修复表结构</button></form>";
} else {
    echo "<p class='fail'>无法连接数据库，请检查 docker-compose 中 db 容器的运行状态。</p>";
}
echo "</div></body></html>";
