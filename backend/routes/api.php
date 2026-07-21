<?php

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

    Route::get('settings', [SettingsController::class, 'show']);
    Route::put('settings', [SettingsController::class, 'update']);

    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store']);
    Route::get('orders/{order}', [OrderController::class, 'show']);
    Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);

    Route::get('inventory', [InventoryController::class, 'index']);
    Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::post('inventory/{ingredient}/restock', [InventoryController::class, 'restock']);
});
