# WeChat Pay Integration Placeholder

This folder reserves the WeChat Pay integration boundary.

First production pass should add:
- Merchant ID and app ID validation.
- Certificate/private-key loading from `payment_configs`.
- Order signing for native/H5/JSAPI flows.
- Callback signature verification.
- Order status synchronization into `orders`.
