import psycopg2
from psycopg2 import sql
from tqdm import tqdm

def batch_update(connection, batch_size=10000):
    with connection.cursor() as cursor:
        while True:
            # Perform the update in batches
            cursor.execute(sql.SQL("""
                UPDATE mosaic_schema.combined_raster_timeseries cm
                SET median = mrt.value
                FROM mosaic_schema.median_raster_timeseries mrt
                WHERE cm.x = mrt.x AND cm.y = mrt.y AND cm.timestamp = mrt.timestamp
                LIMIT %s;
            """), [batch_size])
            
            # Check the number of rows affected by the last command
            rows_updated = cursor.rowcount
            
            # Commit the changes
            connection.commit()

            # Update the tqdm progress bar
            tqdm.update(rows_updated)

            # If no rows were updated, the process is complete
            if rows_updated == 0:
                break
            else:
                print(f"Updated {rows_updated} rows")

def batch_update_outer(connection, batch_size=10000):
    with connection.cursor() as cursor:
        while True:
            # Perform the update in batches
            cursor.execute(sql.SQL("""
                UPDATE mosaic_schema.combined_raster_timeseries cm
                SET outer = mrt.value
                FROM mosaic_schema.outer_raster_timeseries4 mrt
                WHERE cm.x = mrt.x AND cm.y = mrt.y AND cm.timestamp = mrt.timestamp
                LIMIT %s;
            """), [batch_size])
            
            # Check the number of rows affected by the last command
            rows_updated = cursor.rowcount
            
            # Commit the changes
            connection.commit()

            # Update the tqdm progress bar
            tqdm.update(rows_updated)

            # If no rows were updated, the process is complete
            if rows_updated == 0:
                break
            else:
                print(f"Updated {rows_updated} rows")

def main():
    # Connect to the PostgreSQL database
    connection = psycopg2.connect(
        dbname='geoserver_db',
        user='geoserver_user',  # Replace with your database username
        password='password',  # Replace with your database password
        host='localhost',
        port='5432'
    )

    try:
        # Use tqdm to track progress
        print("Updating median values...")
        with tqdm() as tqdm:
            batch_update(connection, batch_size=10000)

        print("Updating outer values...")
        with tqdm() as tqdm:
            batch_update_outer(connection, batch_size=10000)

        print("All rows updated successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Close the database connection
        connection.close()

if __name__ == "__main__":
    main()
