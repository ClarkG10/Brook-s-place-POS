<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\UploadController;
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

    Route::get('settings', [SettingsController::class, 'show']);
    Route::put('settings', [SettingsController::class, 'update']);

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
    Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('inventory/logs', [InventoryController::class, 'logs']);
    Route::post('inventory', [InventoryController::class, 'store']);
    Route::post('inventory/{ingredient}/restock', [InventoryController::class, 'restock']);
    Route::put('inventory/{ingredient}', [InventoryController::class, 'update']);
    Route::delete('inventory/{ingredient}', [InventoryController::class, 'destroy']);
});
