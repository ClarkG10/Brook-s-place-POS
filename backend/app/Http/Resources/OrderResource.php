<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'source' => $this->source,
            'table_number' => $this->table_number,
            'status' => $this->status,
            'customer_name' => $this->customer_name,
            'notes' => $this->notes,
            'subtotal' => (float) $this->subtotal,
            'discount' => (float) $this->discount,
            'tax' => (float) $this->tax,
            'service_charge' => (float) $this->service_charge,
            'total' => (float) $this->total,
            'payment_method' => $this->payment_method,
            'payment_reference' => $this->payment_reference,
            'is_paid' => $this->is_paid,
            'cashier' => $this->whenLoaded('cashier', fn () => $this->cashier?->name),
            'placed_at' => $this->placed_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_name' => $i->product_name,
                'unit_price' => (float) $i->unit_price,
                'quantity' => $i->quantity,
                'line_total' => (float) $i->line_total,
                'notes' => $i->notes,
                'options' => $i->options ?? [],
            ])),
        ];
    }
}
