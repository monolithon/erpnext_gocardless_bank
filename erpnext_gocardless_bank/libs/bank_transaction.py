# ERPNext Gocardless Bank © 2024
# Author:  Ameen Ahmed
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file


import frappe
from frappe import _


# [Schedule, Internal]
_SYNC_KEY_ = "gocardless_auto_sync"


# [Internal]
_SYNC_LIMIT = 4


# [G Bank Form, *Bank Account Form]
@frappe.whitelist(methods=["POST"])
def enqueue_bank_transactions_sync(bank, account, from_dt=None, to_dt=None):
    if (
        not bank or not isinstance(bank, str) or
        not account or not isinstance(account, str) or
        (from_dt and not isinstance(from_dt, str)) or
        (to_dt and not isinstance(to_dt, str))
    ):
        return {"error": _("Arguments required for bank transactions sync are invalid.")}
    
    from .system import settings
    
    settings = settings()
    if not settings._is_enabled:
        from .system import app_disabled_message
        
        return {"error": app_disabled_message(), "disabled": 1}
    
    from .bank import get_bank_doc
    
    doc = get_bank_doc(bank)
    if not doc:
        return {"error": _("Bank \"{0}\" doesn't exist.").format(bank)}
    
    if not doc._is_submitted or not doc._is_auth:
        return {"error": _("Bank \"{0}\" isn't authorized.").format(doc.name)}
    
    data = None
    for v in doc.bank_accounts:
        if v.account == account:
            data = {
                "row_name": v.name,
                "account": v.account,
                "account_id": v.account_id,
                "account_currency": v.account_currency,
                "status": v.status,
                "bank_account_ref": v.bank_account_ref
            }
            break
    
    if not data:
        return {"error": _("Bank account \"{0}\" doesn't belong to bank \"{1}\".").format(account, doc.name)}
    
    if data["status"] != "Ready":
        return {
            "error": (
                _("Bank account \"{0}\" of bank \"{1}\" isn't ready.")
                .format(data["account"], doc.name)
            )
        }
    
    if not data["bank_account_ref"]:
        return {
            "error": (
                _("Bank account \"{0}\" of bank \"{1}\" hasn't been added to ERPNext.")
                .format(data["account"], doc.name)
            )
        }
    
    from .cache import get_cache
    
    if get_cache(_SYNC_KEY_, data["account"], True):
        return {"success": 1}
    
    from .datetime import today_date
    
    today = today_date()
    if not check_sync_data(doc, data, today):
        return {"info": _("Bank account \"{0}\" has exceeded the allowed sync limit for today.").format(data["account"])}
    
    from .system import get_client
    
    client = get_client(doc.company, settings)
    if isinstance(client, dict):
        return client
    
    _store_info({
        "info": "Before preparing from & to dates",
        "bank": doc.name,
        "account": data["account"],
        "from": from_dt,
        "to": to_dt,
        "data": data
    })
    if not from_dt:
        from_dt = today
        to_dt = None
    else:
        from .datetime import (
            reformat_date,
            is_date_gt
        )
        
        from_dt = reformat_date(from_dt)
        if not is_date_gt(today, from_dt):
            from_dt = today
        
        if not to_dt:
            to_dt = None
        else:
            to_dt = reformat_date(to_dt)
            if to_dt != from_dt:
                if is_date_gt(to_dt, today):
                    to_dt = None
                elif is_date_gt(from_dt, to_dt):
                    to_dt = None
    
    dates = get_dates_list(from_dt, to_dt)
    _store_info({
        "info": "After preparing from & to dates",
        "bank": doc.name,
        "account": data["account"],
        "dates": dates,
        "data": data
    })
    for i in range(len(dates)):
        dt = dates.pop(0)
        queue_bank_transactions_sync(
            settings, client, doc.name, doc.bank, doc.company, "Manual",
            data["row_name"], data["account"], data["account_id"],
            data["account_currency"], data["bank_account_ref"],
            dt[0], dt[1], dt[2]
        )
    
    return {"success": 1}


# [Schedule, Internal]
def check_sync_data(doc, data, today):
    from .sync_log import get_sync_data
    
    sync_data = get_sync_data(doc.name, data["account"], today)
    if sync_data is None:
        _store_info({
            "error": "Sync log data is invalid.",
            "bank": doc.name,
            "account_bank": doc.bank,
            "account": data["account"]
        })
        return 0
    
    if len(sync_data) >= _SYNC_LIMIT:
        _store_info({
            "error": "Sync exceeded the allowed limit.",
            "bank": doc.name,
            "account_bank": doc.bank,
            "account": data["account"],
            "limit": _SYNC_LIMIT
        })
        return 0
    
    return 1


# [Schedule, Internal]
def get_dates_list(from_dt, to_dt=None):
    if not to_dt or from_dt == to_dt:
        return [[from_dt, to_dt, 1]]
    
    from .datetime import (
        get_date_obj_range,
        to_date
    )
    
    ret = []
    dates = get_date_obj_range(from_dt, to_dt)
    for i in range(len(dates)):
        f = to_date(dates.pop(0))
        if not dates:
            ret.append([f, f, 1])
            break
        
        t = to_date(dates.pop(0))
        ret.append([f, t, 2])
        if not dates:
            break
    
    return ret


# [Schedule, Internal]
def queue_bank_transactions_sync(
    settings, client, bank, account_bank, company, trigger, row_name,
    account, account_id, account_currency, bank_account_ref,
    from_dt, to_dt=None, dt_diff=1
):
    from .background import is_job_running
    
    job_id = f"gocardless-bank-transactions-sync-{account}"
    if not is_job_running(job_id):
        from .common import unique_key
        from .background import enqueue_job
        
        enqueue_job(
            "erpnext_gocardless_bank.libs.bank_transaction.sync_bank_transactions",
            job_id,
            queue="long",
            timeout=10000 * dt_diff,
            settings=settings,
            client=client,
            sync_id=unique_key(),
            bank=bank,
            account_bank=account_bank,
            company=company,
            trigger=trigger,
            row_name=row_name,
            account=account,
            account_id=account_id,
            account_currency=account_currency,
            bank_account_ref=bank_account_ref,
            from_dt=from_dt,
            to_dt=to_dt
        )


# [Internal]
def sync_bank_transactions(
    settings, client, sync_id, bank, account_bank, company, trigger, row_name,
    account, account_id, account_currency, bank_account_ref, from_dt, to_dt=None
):
    transactions = client.get_account_transactions(account_id, from_dt, to_dt)
    if transactions and "error" in transactions:
        return 0
    
    from .cache import set_cache
    
    set_cache(_SYNC_KEY_, account, True, 1500)
    result = frappe._dict({
        "entries": [],
        "synced": False,
    })
    
    try:
        if transactions:
            for k in ["booked", "pending"]:
                if (
                    k in transactions and transactions[k] and
                    isinstance(transactions[k], list)
                ):
                    _store_info({
                        "info": "Processing bank transactions.",
                        "key": k,
                        "account": account,
                        "data": transactions[k]
                    })
                    
                    add_transactions(
                        result, settings, sync_id, bank, account_bank, company,
                        trigger, account, account_currency, bank_account_ref, k,
                        client.prepare_entries(transactions.pop(k))
                    )
                else:
                    _store_info({
                        "info": "Skipping bank transactions.",
                        "key": k,
                        "account": account
                    })
    finally:
        from .bank_account import update_bank_account_data
        from .cache import del_cache, clear_doc_cache
        from .sync_log import add_sync_data
        
        if to_dt:
            from .datetime import date_to_datetime
            
            last_sync = date_to_datetime(to_dt)
        
        else:
            from .datetime import today_datetime
            
            last_sync = today_datetime()
        
        values = {"last_sync": last_sync}
        if result.synced:
            balances = client.get_account_balances(account_id)
            if balances and "error" not in balances:
                from .common import to_json
                
                values["balances"] = to_json(balances)
        
        update_bank_account_data(row_name, values)
        add_sync_data(sync_id, bank, account, trigger, len(result.entries))
        del_cache(_SYNC_KEY_, account)
        clear_doc_cache("Bank Transaction")


# [Internal]
def add_transactions(
    result, settings, sync_id, bank, account_bank, company, trigger,
    account, account_currency, bank_account_ref, status, transactions
):
    result.synced = True
    for i in range(len(transactions)):
        new_bank_transaction(
            result, settings, company, account_bank, account,
            account_currency, bank_account_ref, transactions.pop(0), status
        )


# [Internal]
def new_bank_transaction(
    result, settings, company, account_bank, account,
    account_currency, bank_account_ref, data, status
):
    from .datetime import today_datetime
    
    if "transaction_id" not in data:
        if settings.bank_transaction_without_id == "Ignore":
            _store_info({
                "error": "Transaction has no id so ignored.",
                "account_bank": account_bank,
                "account": account,
                "account_currency": account_currency,
                "bank_account_ref": bank_account_ref,
                "status": status,
                "data": data
            })
            return 0
        else:
            from .common import unique_key
            
            data["transaction_id"] = unique_key(data)
    
    if "date" not in data:
        if settings.bank_transaction_without_date == "Ignore":
            _store_info({
                "error": "Transaction has no date so ignored.",
                "account_bank": account_bank,
                "account": account,
                "account_currency": account_currency,
                "bank_account_ref": bank_account_ref,
                "status": status,
                "data": data
            })
            return 0
        
        data["date"] = today_datetime()
    
    if "amount" not in data:
        if settings.bank_transaction_without_amount == "Ignore":
            _store_info({
                "error": "Transaction has no amount so ignored.",
                "account_bank": account_bank,
                "account": account,
                "account_currency": account_currency,
                "bank_account_ref": bank_account_ref,
                "status": status,
                "data": data
            })
            return 0
        
        data["amount"] = 0
    
    if "currency" not in data:
        if settings.bank_transaction_without_currency == "Ignore":
            _store_info({
                "error": "Transaction has no currency so ignored.",
                "account_bank": account_bank,
                "account": account,
                "account_currency": account_currency,
                "bank_account_ref": bank_account_ref,
                "status": status,
                "data": data
            })
            return 0
        
        data["currency"] = account_currency
    
    else:
        from .currency import get_currency_status
        
        currency_status = get_currency_status(data["currency"])
        if currency_status is None:
            if settings.bank_transaction_currency_doesnt_exist == "Ignore":
                _store_info({
                    "error": "Transaction currency doesn't exist so ignored.",
                    "account_bank": account_bank,
                    "account": account,
                    "account_currency": account_currency,
                    "bank_account_ref": bank_account_ref,
                    "status": status,
                    "data": data
                })
                return 0
            
            from .currency import add_currencies
            
            add_currencies([data["currency"]])
        elif not currency_status:
            if settings.bank_transaction_currency_disabled == "Ignore":
                _store_info({
                    "error": "Transaction currency is disabled so ignored.",
                    "account_bank": account_bank,
                    "account": account,
                    "account_currency": account_currency,
                    "bank_account_ref": bank_account_ref,
                    "status": status,
                    "data": data
                })
                return 0
            
            from .currency import enable_currencies
            
            enable_currencies([data["currency"]])
    
    from frappe.utils import flt
    
    data["amount"] = flt(data["amount"])
    def_amount = 0.0
    if data["amount"] >= def_amount:
        debit = abs(data["amount"])
        credit = def_amount
    else:
        debit = def_amount
        credit = abs(data["amount"])
    
    dt = "Bank Transaction"
    status = "Pending" if status == "pending" else "Settled"
    if not frappe.db.exists(dt, {"transaction_id": data["transaction_id"]}):
        from .datetime import reformat_date
        
        try:
            entry_data = {
                "date": reformat_date(data["date"]),
                "status": status,
                "bank_account": bank_account_ref,
                "deposit": debit,
                "withdrawal": credit,
                "currency": data["currency"],
                "description": data.get("description", ""),
                "gocardless_transaction_info": data.get("information", ""),
                "reference_number": data.get("reference_number", ""),
                "transaction_id": data["transaction_id"],
                "from_gocardless": 1
            }
            
            handle_transaction_supplier(settings, company, entry_data, account_bank, data)
            handle_transaction_customer(settings, company, entry_data, account_bank, data)
            
            doc = (frappe.new_doc(dt)
                .update(entry_data)
                .insert(ignore_permissions=True, ignore_mandatory=True)
                .submit())
            
            result.entries.append(doc.name)
        except Exception as exc:
            _store_error({
                "error": "Unable to add new transaction.",
                "account_bank": account_bank,
                "account": account,
                "account_currency": account_currency,
                "bank_account_ref": bank_account_ref,
                "status": status,
                "data": data,
                "exception": str(exc)
            })


# [Internal]
def handle_transaction_supplier(settings, company, entry, account_bank, data):
    if (
        settings.supplier_exist_in_transaction == "Ignore" or
        not data.get("supplier", "") or
        not isinstance(data["supplier"], dict) or
        not data["supplier"].get("name", "") or
        not isinstance(data["supplier"]["name"], str)
    ):
        return 0
    
    dt = "Supplier"
    name = data["supplier"]["name"]
    ignore_supplier = False
    if not frappe.db.exists(dt, {"supplier_name": name}):
        if (
            settings.supplier_in_transaction_doesnt_exist == "Ignore" or
            not settings.supplier_default_group
        ):
            return 0
        
        from .cache import clear_doc_cache
        
        try:
            doc = (frappe.new_doc(dt)
                .update({
                    "supplier_name": name,
                    "supplier_group": settings.supplier_default_group,
                    "supplier_type": "Individual",
                    "from_gocardless": 1
                })
                .insert(ignore_permissions=True, ignore_mandatory=True))
            entry["party_type"] = dt
            entry["party"] = doc.name
            
            clear_doc_cache(dt)
        except Exception as exc:
            _store_error({
                "error": "Unable to create new supplier.",
                "data": data["supplier"],
                "exception": str(exc)
            })
            ignore_supplier = True
    
    else:
        entry["party_type"] = dt
        entry["party"] = frappe.db.get_value(dt, {"supplier_name": name}, "name")
        if isinstance(entry["party"], list):
            entry["party"] = entry["party"].pop(0) if entry["party"] else ""
    
    if (
        ignore_supplier or
        settings.supplier_bank_account_exist_in_transaction == "Ignore" or
        not data["supplier"].get("account", "") or
        not isinstance(data["supplier"]["account"], str)
    ):
        return 0
    
    from .bank_account import add_party_bank_account
    
    acc_name = add_party_bank_account(
        name, dt, account_bank, company,
        data["supplier"]["account"],
        data["supplier"].get("account_no", ""),
        data["supplier"].get("iban", "")
    )
    if not acc_name or not entry["party"]:
        return 0
    
    from .cache import clear_doc_cache
    
    frappe.flags.from_gocardless_update = 1
    frappe.db.set_value(
        dt,
        entry["party"],
        "default_bank_account",
        acc_name
    )
    frappe.flags.pop("from_gocardless_update", 0)
    clear_doc_cache(dt)


# [Internal]
def handle_transaction_customer(settings, company, entry, account_bank, data):
    if (
        settings.customer_exist_in_transaction == "Ignore" or
        entry.get("party_type", "") or
        entry.get("party", "") or
        not data.get("customer", "") or
        not isinstance(data["customer"], dict) or
        not data["customer"].get("name", "") or
        not isinstance(data["customer"]["name"], str)
    ):
        return 0
    
    dt = "Customer"
    name = data["customer"]["name"]
    ignore_customer = False
    if not frappe.db.exists(dt, {"customer_name": name}):
        if (
            settings.customer_in_transaction_doesnt_exist == "Ignore" or
            not settings.customer_default_group or
            not settings.customer_default_territory
        ):
            return 0
        
        from .cache import clear_doc_cache
        
        try:
            doc = (frappe.new_doc(dt)
                .update({
                    "customer_name": name,
                    "customer_type": "Individual",
                    "customer_group": settings.customer_default_group,
                    "territory": settings.customer_default_territory,
                    "from_gocardless": 1
                })
                .insert(ignore_permissions=True, ignore_mandatory=True))
            entry["party_type"] = dt
            entry["party"] = doc.name
            
            clear_doc_cache(dt)
        except Exception as exc:
            _store_error({
                "error": "Unable to create new customer.",
                "data": data["customer"],
                "exception": str(exc)
            })
            ignore_customer = True
    else:
        entry["party_type"] = dt
        entry["party"] = frappe.db.get_value(dt, {"customer_name": name}, "name")
        if isinstance(entry["party"], list):
            entry["party"] = entry["party"].pop(0) if entry["party"] else ""
    
    if (
        ignore_customer or
        settings.customer_bank_account_exist_in_transaction == "Ignore" or
        not data["customer"].get("account", "") or
        not isinstance(data["customer"]["account"], str)
    ):
        return 0
    
    from .bank_account import add_party_bank_account
    
    acc_name = add_party_bank_account(
        name, dt, account_bank, company,
        data["customer"]["account"],
        data["customer"].get("account_no", ""),
        data["customer"].get("iban", "")
    )
    if not acc_name or not entry["party"]:
        return 0
    
    from .cache import clear_doc_cache
    
    frappe.flags.from_gocardless_update = 1
    frappe.db.set_value(
        dt,
        entry["party"],
        "default_bank_account",
        acc_name
    )
    frappe.flags.pop("from_gocardless_update", 0)
    clear_doc_cache(dt)


# [Internal]
def _store_error(data):
    from .common import store_error
    
    store_error(data)


# [Internal]
def _store_info(data):
    from .common import store_info
    
    store_info(data)