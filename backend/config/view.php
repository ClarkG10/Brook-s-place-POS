<?php

return [

    /*
    |--------------------------------------------------------------------------
    | View Storage Paths
    |--------------------------------------------------------------------------
    */

    'paths' => [
        resource_path('views'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Compiled View Path
    |--------------------------------------------------------------------------
    |
    | Explicit (not realpath()) so the path is always a valid string even when
    | the directory does not yet exist — otherwise `config:cache` bakes in
    | `false` and `view:cache` fails with "View path not found" on a fresh
    | deploy (e.g. Laravel Forge release directories).
    |
    */

    'compiled' => env(
        'VIEW_COMPILED_PATH',
        storage_path('framework/views'),
    ),

];
