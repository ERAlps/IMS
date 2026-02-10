<?php
/**
 * 智库 IMS - 数据库核心配置文件
 */

$pdo = null;
$pdo_error = null;

define('DB_HOST', 'db');
define('DB_NAME', 'ims_db');
define('DB_USER', 'ims_user');
define('DB_PASS', 'ims_password'); 

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (Exception $e) {
    $pdo_error = $e->getMessage();
} catch (Throwable $t) {
    $pdo_error = $t->getMessage();
}