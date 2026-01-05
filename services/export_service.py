import io
from openpyxl import Workbook
from openpyxl.styles import Font

class ExportService:
    """
    Generic Service for generating file exports (Excel/CSV).
    Decoupled from specific business entities (Intervention, Equipment, etc.).
    It receives raw data and formatting instructions to produce a binary file.
    """

    @staticmethod
    def generate_excel(headers, data_rows, sheet_title="Export"):
        """
        Creates an in-memory Excel file from provided headers and data rows.

        Args:
            headers (List[str]): A list of column names (e.g., ['ID', 'Date', 'Name']).
            data_rows (List[List[Any]]): A list of lists, where each inner list represents a row of data.
                                         The order must match the 'headers' list.
            sheet_title (str): The name of the worksheet.

        Returns:
            BytesIO: The binary stream of the generated Excel file.
        """
        # 1. Create an in-memory Excel workbook
        wb = Workbook()
        ws = wb.active
        ws.title = sheet_title

        # 2. Append the Header Row
        ws.append(headers)

        # STYLING: Make the header row bold
        for cell in ws[1]:
            cell.font = Font(bold=True)

        # 3. Append Data Rows
        for row in data_rows:
            ws.append(row)

        # STYLING: Auto-adjust column widths based on content length
        for column_cells in ws.columns:
            length = 0
            # Check length of all cells in column (header + data) to find max
            for cell in column_cells:
                if cell.value:
                    length = max(length, len(str(cell.value)))
            
            # Apply width with a little extra padding (+2)
            ws.column_dimensions[column_cells[0].column_letter].width = length + 2

        # 4. Save the workbook to an in-memory buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        return output