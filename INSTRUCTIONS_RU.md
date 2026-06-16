# Инструкция ZKGRM CPU Miner

Этот репозиторий обновлён под новый ZKGRM Miner contract.

## Что изменилось относительно старого GRM

- Старые hardcoded GRM givers удалены из runtime.
- `get_pow_params` читается в формате GRM: `(seed, pow_complexity, amount, target_delta)`.
- `amount` передаётся в `pow-miner` как третий числовой параметр, как в старой GRM инструкции.
- Если указан `TARGET_ADDRESS`, скрипт дописывает recipient в mined body отдельным ref. Это совместимо с новым контрактом и не меняет PoW hash.

## Настройка

Создайте `.env`:

```env
MNEMONIC='word1 word2 ... word24'
ZKGRM_GIVERS='EQ_GIVER_1:100000000000,EQ_GIVER_2:1000000000000'
TARGET_ADDRESS=''
```

`ZKGRM_GIVERS` указывается через запятую в формате `address:amount`.

Примеры amount:

- `100000000000` - extra small giver, 100 ZKGRM при 9 decimals или 100000 при 6 decimals, зависит от metadata.
- `1000000000000` - small giver.
- `10000000000000` - medium giver.
- `100000000000000` - large giver.

Если `TARGET_ADDRESS` пустой, награда приходит на кошелёк из `MNEMONIC`.

## Запуск

```bash
yarn install
yarn start
```

Файл `pow-miner` должен быть исполняемым и подходить под вашу ОС.

## Важно

- Giver должен быть уже задеплоен, профинансирован ZKGRM и помечен как `protocol` wallet в ZKGRM minter.
- Для высокой нагрузки лучше использовать несколько givers, как в GRM: один giver является последовательным bottleneck.
- Обычные transfers ZKGRM заблокированы политикой токена; mining reward работает через protocol wallet giver.
