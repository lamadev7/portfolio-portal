---
title: StockSense
tagline: Inventory agents that cut stockouts and overstock, measured on real sales data.
summary: Inventory agents on Walmart's public M5 sales data. They forecast demand, plan reorders, catch missing stock and rebalance stores, and a planner approves every purchase order.
kicker: Retail inventory · multi-agent · forecasting · MCP
status: todo
when: TODO
year: 2026
role: Solo
order: 4.6
featured: true
f1: Forecast agent | Probabilistic demand for slow, irregular sellers from statistical models; the LLM explains, never invents numbers.
f2: Replenishment agent | Reorder points and safety stock per item and store, then draft purchase orders a planner approves.
f3: Shrink detector | Flags items that should be selling but aren't, a sign the stock is missing from the shelf.
f4: Rebalancing agent | Suggests transfers from overstocked stores to stores about to run out.
f5: Planner chat | Answers "why is this reordering?" with exact figures from inventory tools over MCP.
f6: Backtest evals | Replays the last 28 days of M5 against a min/max baseline: fill rate, stockout days, holding cost.
m1: 3,049 items | 10 stores, daily sales from Walmart's M5 dataset
m2: 28 days | held-out backtest against a min/max baseline
m3: Approved | no purchase order goes out without a planner
cardStack: Next.js · FastAPI · LangGraph · LightGBM · PostgreSQL · MCP · AWS
cta: case
stack: [Next.js, TypeScript, FastAPI, Python, LangGraph, Claude, LightGBM, statsforecast, PostgreSQL, MCP, ECS Fargate, Step Functions, EventBridge, Langfuse, GitHub Actions]
highlight: Out-of-stocks and overstock cost retailers about $1.7 trillion a year (IHL Group, 2025). StockSense measures how much of that a team of agents can win back, with a backtest anyone can rerun.
art: s15
---

Retailers lose about $1.7–1.77 trillion a year to inventory distortion, roughly 6.5% of global retail sales. About $1.2 trillion of that is out-of-stocks and about $572 billion is overstock ([IHL Group, 2025](https://www.ihlservices.com/product/inventory-distortion/)). The causes are familiar to anyone who has run a store or a warehouse: demand that is hard to predict, suppliers that arrive late, and stock the system says is there but the shelf doesn't have.

StockSense gives that work to a small team of agents. The numbers come from forecasting and inventory math, never from the language model, and a planner approves every order.

## What it does

- **Forecast agent:** produces probabilistic demand forecasts for every item and store, with models built for slow, irregular sellers. In M5, about 60% of daily values are zero.
- **Replenishment agent:** turns forecasts and supplier lead times into reorder points and safety stock for a chosen service level, then drafts purchase orders.
- **Shrink detector:** flags items that should be selling but have stopped while the system still shows stock. Those are the likely missing or misplaced items.
- **Rebalancing agent:** suggests moving stock from stores with too much to stores about to run out, before anyone reorders.
- **Planner chat:** answers questions such as "why is this item reordering?" or "what runs out first next week?" with exact figures pulled from the inventory tools.

## How it's measured

The last 28 days of the M5 data are held out, and the agents' decisions are replayed day by day against a simple min/max reorder rule. The published report compares:

- fill rate and stockout days
- inventory holding cost and overstock
- forecast error
- how often the agents' answers match the tool data exactly

The backtest runs in CI, so a change that makes any of these worse fails the build.

## Architecture

```
Next.js planner console + chat
  -> API Gateway
  -> ECS Fargate: LangGraph orchestrator
       -> forecast, replenishment, shrink and rebalancing agents
       -> MCP server "inventory-tools" (stock, forecast, draft_po, transfer)
       -> FastAPI forecasting service (statsforecast, LightGBM)
  -> PostgreSQL (sales, stock, orders)
  -> Step Functions (planner approval for every purchase order)
  -> EventBridge (nightly runs), Langfuse (traces, cost)
```

## Data

The project uses [M5](https://www.kaggle.com/competitions/m5-forecasting-accuracy), Walmart's daily unit sales for 3,049 products across 10 stores from 2011 to 2016, with prices and calendar events. [Favorita](https://www.kaggle.com/competitions/favorita-grocery-sales-forecasting), 54 grocery stores in Ecuador, is a second dataset for perishable goods restocked daily. Supplier lead times and on-hand stock are simulated, and their assumptions are written up with the results.
