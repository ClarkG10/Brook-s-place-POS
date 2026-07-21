<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\UploadController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StorefrontController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API — customer ordering app (no auth)
|--------------------------------------------------------------------------
*/
Route::prefix('public')->group(function () {
    Route::get('settings', [StorefrontController::class, 'settings']);
    Route::get('menu', [StorefrontController::class, 'menu']);
    Route::post('orders', [StorefrontController::class, 'placeOrder']);
    Route::get('orders/{orderNumber}/status', [StorefrontController::class, 'orderStatus']);
});

/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
Route::post('auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Self-service — any authenticated user manages their own account.
    Route::put('auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('auth/password', [AuthController::class, 'updatePassword']);
});

/*
|--------------------------------------------------------------------------
| Admin API — management portal (Sanctum token required)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'summary']);

    // Sales reports
    Route::get('reports/sales', [ReportController::class, 'sales']);
    Route::get('reports/sales/export', [ReportController::class, 'export']);

    // All staff can read settings (shop name, theme, currency drive the admin shell);
    // only the owner may change them.
    Route::get('settings', [SettingsController::class, 'show']);
    Route::put('settings', [SettingsController::class, 'update'])->middleware('role:owner');

    // Staff account management — owner only.
    Route::middleware('role:owner')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::put('users/{user}', [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);
    });

    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store']);
    Route::get('orders/{order}', [OrderController::class, 'show']);
    Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);

    // Menu management
    Route::get('products', [ProductController::class, 'index']);
    Route::post('products', [ProductController::class, 'store']);
    Route::put('products/{product}', [ProductController::class, 'update']);
    Route::delete('products/{product}', [ProductController::class, 'destroy']);

    Route::get('categories', [CategoryController::class, 'index']);
    Route::post('categories', [CategoryController::class, 'store']);
    Route::put('categories/{category}', [CategoryController::class, 'update']);
    Route::delete('categories/{category}', [CategoryController::class, 'destroy']);

    // Image uploads
    Route::post('uploads', [UploadController::class, 'store']);

    // Inventory
    Route::get('inventory', [InventoryController::class, 'index']);
    Route::get('inventory/analytics', [InventoryController::class, 'analytics']);
    Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('inventory/logs', [InventoryController::class, 'logs']);
    Route::post('inventory', [InventoryController::class, 'store']);
    Route::post('inventory/{ingredient}/restock', [InventoryController::class, 'restock']);
    Route::put('inventory/{ingredient}', [InventoryController::class, 'update']);
    Route::delete('inventory/{ingredient}', [InventoryController::class, 'destroy']);
});
