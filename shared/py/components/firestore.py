from typing import Any, Callable, TypeVar

from firebase_admin import firestore
from google.cloud.firestore_v1.base_document import DocumentSnapshot
from google.cloud.firestore_v1.document import DocumentReference
from google.cloud.firestore_v1.transaction import Transaction
from pydantic import BaseModel
from shared.py.components.firebase import db

T = TypeVar("T", bound=BaseModel)


def update_doc(collection: str, id: str, update: Callable[[T], T], model: type[T]):
    transaction = db.transaction()  # type: ignore
    doc_ref = db.collection(collection).document(id)

    @firestore.transactional  # type: ignore
    def transact(t: Transaction, d: DocumentReference) -> bool:
        try:
            snapshot: DocumentSnapshot = d.get(transaction=t)  # type: ignore
            if not snapshot.exists:
                raise Exception(
                    f"ERROR could not find doc of id '{id}' in collection '{collection}'"
                )

            data = snapshot.to_dict()

            # TYPE check data
            if not data:
                raise Exception(
                    f"ERROR could validate data for doc of id '{id}' in collection '{collection}'",  # noqa: E501
                )
            valid_data = model(**data)

            # RUN update operation
            new_data = update(valid_data)

            # WRITE to database
            t.update(d, new_data.model_dump())  # type: ignore

            return True

        except Exception as e:
            print(e)
            return False

    result = transact(transaction, doc_ref)

    return result


def get_doc(collection: str, id: str, model: type[T] | None = None) -> T | None | Any:
    doc_ref = db.collection(collection).document(id)

    doc_snapshot = doc_ref.get()  # type: ignore

    # 6. Check if the document exists and get its data
    if doc_snapshot.exists:
        data = doc_snapshot.to_dict()

        if model:
            try:
                if not data:
                    raise Exception("empty data object")

                valid_data = model(**data)
                return valid_data

            except Exception as e:
                print(
                    f"ERROR could validate data for doc of id '{id}' in collection '{collection}'",  # noqa: E501
                    e,
                )
                print(data)
                return None

        else:
            return data

    else:
        print(f"ERROR could not find doc of id '{id}' in collection '{collection}'")
        return None
