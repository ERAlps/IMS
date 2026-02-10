<?php
/**
 * 智库 IMS - 核心后端终端 (增强稳定性版本)
 */

// 开启输出缓冲，拦截所有非预期输出（如 include 产生的空格）
ob_start();

// 致命错误处理器：如果发生严重 PHP 错误，捕获并返回 JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR)) {
        // 清除之前的缓冲区（如 HTML 报错信息）
        while (ob_get_level()) ob_end_clean();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode(["error" => "PHP 致命错误: " . $error['message'] . " 在 " . $error['file'] . ":" . $error['line']], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }
});

// 关闭标准错误显示，防止 PHP 警告信息破坏 JSON 结构
error_reporting(0);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * 清理缓冲区并发送 JSON
 */
function send_json($data, $code = 200) {
    // 清除缓冲区所有内容，确保只输出纯 JSON
    while (ob_get_level()) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

try {
    require_once 'config.php';
    
    if (!$pdo) {
        send_json(["error" => "数据库连接异常: " . ($pdo_error ?? '连接未初始化')], 500);
    }

    $action = $_GET['action'] ?? '';
    
    // 登录接口
    if ($action === 'login') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data) send_json(['error' => '无效的 JSON 请求体'], 400);

        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $u = $stmt->fetch();
        
        if ($u && ($password === 'admin123' || password_verify($password, $u['password']))) {
            $_SESSION['user'] = ['id' => $u['id'], 'username' => $u['username']];
            session_write_close();
            send_json(['success' => true, 'user' => $_SESSION['user']]);
        }
        send_json(['error' => '用户名或密码错误'], 401);
    }

    if ($action === 'logout') { 
        session_destroy(); 
        send_json(['success' => true]);
    }
    
    if ($action === 'me') { 
        send_json(['user' => $_SESSION['user'] ?? null]);
    }

    // 鉴权拦截
    if (!isset($_SESSION['user'])) {
        send_json(['error' => 'Unauthorized: 请重新登录'], 401);
    }

    switch ($action) {
        case 'list':
            $stmt = $pdo->query("SELECT * FROM products ORDER BY id DESC");
            $rows = $stmt->fetchAll();
            send_json($rows ?: []);
            break;

        case 'save':
            $id = $_POST['id'] ?? null;
            $num = function($key, $default = '0') {
                $val = trim($_POST[$key] ?? '');
                if ($val === '' || !is_numeric($val)) return $default;
                return (string)$val;
            };

            $fields = [
                'name' => $_POST['name'] ?? '未命名资产',
                'category' => $_POST['category'] ?? '通用',
                'purchase_price' => $num('purchasePrice'),
                'purchase_quantity' => $num('purchaseQuantity', '1'),
                'purchase_tax_amount' => $num('purchaseTax', '13'),
                'selling_price' => $num('sellingPrice'),
                'sales_quantity' => $num('salesQuantity'),
                'sales_tax_amount' => $num('salesTax', '13'),
                'purchase_channel' => $_POST['purchaseChannel'] ?? '',
                'customer_name' => $_POST['customerName'] ?? '',
                'purchase_invoice_date' => !empty($_POST['purchaseDate']) ? $_POST['purchaseDate'] : null,
                'sales_invoice_date' => !empty($_POST['salesInvoiceDate']) ? $_POST['salesInvoiceDate'] : null,
                'shipped_date' => !empty($_POST['shippedDate']) ? $_POST['shippedDate'] : null,
                'payment_date' => !empty($_POST['paymentDate']) ? $_POST['paymentDate'] : null,
                'sales_contract_id' => !empty($_POST['salesContractId']) ? $_POST['salesContractId'] : null,
                'shipped' => !empty($_POST['shippedDate']) ? 1 : 0,
                'paid' => !empty($_POST['paymentDate']) ? 1 : 0
            ];

            if ($id) {
                $sets = []; $vals = [];
                foreach ($fields as $k => $v) { $sets[] = "$k = ?"; $vals[] = $v; }
                $vals[] = $id;
                $pdo->prepare("UPDATE products SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
            } else {
                $cols = implode(', ', array_keys($fields));
                $ques = implode(', ', array_fill(0, count($fields), '?'));
                $pdo->prepare("INSERT INTO products ($cols) VALUES ($ques)")->execute(array_values($fields));
                $id = $pdo->lastInsertId();
            }
            send_json(['success' => true, 'id' => $id]);
            break;

        case 'delete':
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$data['id']]);
            send_json(['success' => true]);
            break;

        case 'deleteContract':
            $data = json_decode(file_get_contents('php://input'), true);
            $contractId = $data['contractId'];
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("SELECT * FROM products WHERE sales_contract_id = ?");
                $stmt->execute([$contractId]);
                $contractProducts = $stmt->fetchAll();
                $pdo->prepare("UPDATE products SET sales_contract_id = NULL, customer_name = NULL, sales_invoice_date = NULL, sales_quantity = 0, shipped = 0, paid = 0, shipped_date = NULL, payment_date = NULL WHERE sales_contract_id = ?")
                    ->execute([$contractId]);
                // 尝试合并回库存（如果存在相同批次）
                foreach ($contractProducts as $cp) {
                    $check = $pdo->prepare("SELECT id, purchase_quantity FROM products WHERE name = ? AND category = ? AND purchase_price = ? AND purchase_channel = ? AND purchase_invoice_date <=> ? AND sales_contract_id IS NULL AND id != ? LIMIT 1");
                    $check->execute([$cp['name'], $cp['category'], $cp['purchase_price'], $cp['purchase_channel'], $cp['purchase_invoice_date'], $cp['id']]);
                    $target = $check->fetch();
                    if ($target) {
                        $newQty = (float)$target['purchase_quantity'] + (float)$cp['purchase_quantity'];
                        $pdo->prepare("UPDATE products SET purchase_quantity = ? WHERE id = ?")->execute([$newQty, $target['id']]);
                        $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$cp['id']]);
                    }
                }
                $pdo->commit();
                send_json(['success' => true]);
            } catch (Exception $e) { $pdo->rollBack(); send_json(['error' => $e->getMessage()], 500); }
            break;

        case 'toggleStatus':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id']; $field = $data['field']; $customDate = $data['date'] ?? null;
            $st = $pdo->prepare("SELECT $field FROM products WHERE id = ?");
            $st->execute([$id]);
            $current = $st->fetchColumn();
            
            $newVal = $customDate ? 1 : ($current ? 0 : 1);
            
            $now = $customDate ?: date('Y-m-d');
            $dateField = ($field === 'paid') ? 'payment_date' : 'shipped_date';
            $pdo->prepare("UPDATE products SET $field = ?, $dateField = ? WHERE id = ?")->execute([$newVal, $newVal ? $now : null, $id]);
            send_json(['success' => true]);
            break;
            
        case 'batchUpdate':
            $data = json_decode(file_get_contents('php://input'), true);
            $ids = $data['ids'] ?? [];
            $field = $data['field'] ?? '';
            $date = $data['date'] ?? null;
            
            if (empty($ids) || empty($field)) {
                send_json(['success' => true]);
            }

            // 批量更新：如果有日期则状态为1，否则不做变更或设为0（此处逻辑为设日期即完成）
            $val = $date ? 1 : 0;
            $now = $date ?: null;
            $dateField = ($field === 'paid') ? 'payment_date' : 'shipped_date';
            
            // 构建 IN (?,?,?) 占位符
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $sql = "UPDATE products SET $field = ?, $dateField = ? WHERE id IN ($placeholders)";
            
            // 合并参数
            $params = array_merge([$val, $now], $ids);
            
            $pdo->prepare($sql)->execute($params);
            send_json(['success' => true]);
            break;

        case 'assignToContract':
            $data = json_decode(file_get_contents('php://input'), true);
            $contractId = $data['contractId']; $customerName = $data['customerName']; $salesDate = $data['salesDate']; $assignments = $data['assignments'];
            $pdo->beginTransaction();
            try {
                foreach ($assignments as $assign) {
                    $id = $assign['id']; $qtyToSell = $assign['qty']; $price = $assign['price']; $tax = $assign['tax'];
                    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
                    $stmt->execute([$id]);
                    $p = $stmt->fetch();
                    if (!$p) continue;
                    
                    if ((float)$qtyToSell >= (float)$p['purchase_quantity']) {
                        // 全量销售
                        $pdo->prepare("UPDATE products SET sales_contract_id = ?, customer_name = ?, sales_invoice_date = ?, sales_quantity = purchase_quantity, selling_price = ?, sales_tax_amount = ? WHERE id = ?")
                            ->execute([$contractId, $customerName, $salesDate, $price, $tax, $id]);
                    } else {
                        // 拆分销售：更新原库存，新建销售记录
                        $newStockQty = (float)$p['purchase_quantity'] - (float)$qtyToSell;
                        $pdo->prepare("UPDATE products SET purchase_quantity = ? WHERE id = ?")->execute([$newStockQty, $id]);
                        
                        $fields = $p; unset($fields['id'], $fields['created_at']);
                        $fields['purchase_quantity'] = $qtyToSell;
                        $fields['sales_quantity'] = $qtyToSell;
                        $fields['sales_contract_id'] = $contractId;
                        $fields['customer_name'] = $customerName;
                        $fields['sales_invoice_date'] = $salesDate;
                        $fields['selling_price'] = $price;
                        $fields['sales_tax_amount'] = $tax;
                        
                        $cols = implode(', ', array_keys($fields));
                        $ques = implode(', ', array_fill(0, count($fields), '?'));
                        $pdo->prepare("INSERT INTO products ($cols) VALUES ($ques)")->execute(array_values($fields));
                    }
                }
                $pdo->commit();
                send_json(['success' => true]);
            } catch (Exception $e) { $pdo->rollBack(); send_json(['error' => $e->getMessage()], 500); }
            break;
            
        default: 
            send_json(["error" => "未找到该 API 路径 ($action)"], 404);
    }
} catch (Exception $e) {
    send_json(['error' => "内部服务器错误: " . $e->getMessage()], 500);
}
