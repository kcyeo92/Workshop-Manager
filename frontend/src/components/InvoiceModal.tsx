import { useRef } from 'react'
import { type Item } from '../api/items'
import Modal from './Modal'

interface InvoiceModalProps {
  tasks: Item[]
  isOpen: boolean
  onClose: () => void
  invoiceNumber?: string
  invoiceDate?: number
}

export default function InvoiceModal({ tasks, isOpen, onClose, invoiceNumber: propInvoiceNumber, invoiceDate: propInvoiceDate }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)

  const getFilename = () => {
    const invoiceNumber = propInvoiceNumber || (tasks.length > 0 ? tasks[0].id.toString() : '')
    const customerName = tasks.length > 0 ? tasks[0].customer : 'Customer'
    const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    return `Invoice_${today}_${invoiceNumber}_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600')
      if (printWindow) {
        const filename = getFilename()
        printWindow.document.write(`
          <html>
            <head>
              <title>${filename}</title>
              <style>
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: black; }
                .invoice-container { max-width: 800px; margin: 0 auto; }
                .header { text-align: left; margin-bottom: 30px; }
                .company-name { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
                .company-details { font-size: 12px; line-height: 1.5; }
                .invoice-info { text-align: right; margin-bottom: 30px; }
                .invoice-number { font-size: 14px; font-weight: bold; }
                .invoice-details { font-size: 12px; }
                .payment-method { text-align: left; margin-bottom: 30px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { border-bottom: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                td { padding: 8px; font-size: 12px; border-bottom: none; }
                .amount-column { text-align: right; }
                .total-row { font-weight: bold; border-top: 2px solid #000; }
                .total-words { margin: 20px 0; font-size: 12px; }
                .signature-section { margin-top: 80px; display: flex; justify-content: space-between; }
                .signature-box { text-align: center; width: 45%; }
                .signature-line { border-top: 1px solid #000; padding-top: 5px; font-size: 12px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; }
                @page {
                  margin-top: 40px;
                  margin-bottom: 20px;
                  margin-left: 40px;
                  margin-right: 20px;
                  size: auto;
                }
                @media print {
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                }
              </style>
            </head>
            <body>
              ${invoiceRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  const handleSave = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600')
      if (printWindow) {
        const filename = getFilename()
        printWindow.document.write(`
          <html>
            <head>
              <title>${filename}</title>
              <style>
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: black; }
                .invoice-container { max-width: 800px; margin: 0 auto; }
                .header { text-align: left; margin-bottom: 30px; }
                .company-name { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
                .company-details { font-size: 12px; line-height: 1.5; }
                .invoice-info { text-align: right; margin-bottom: 30px; }
                .invoice-number { font-size: 14px; font-weight: bold; }
                .invoice-details { font-size: 12px; }
                .payment-method { text-align: left; margin-bottom: 30px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { border-bottom: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                td { padding: 8px; font-size: 12px; border-bottom: none; }
                .amount-column { text-align: right; }
                .total-row { font-weight: bold; border-top: 2px solid #000; }
                .total-words { margin: 20px 0; font-size: 12px; }
                .signature-section { margin-top: 80px; display: flex; justify-content: space-between; }
                .signature-box { text-align: center; width: 45%; }
                .signature-line { border-top: 1px solid #000; padding-top: 5px; font-size: 12px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; }
                @page {
                  margin-top: 40px;
                  margin-bottom: 20px;
                  margin-left: 40px;
                  margin-right: 20px;
                  size: auto;
                }
                @media print {
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                }
              </style>
            </head>
            <body>
              ${invoiceRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        
        // Use print dialog with save as PDF option
        setTimeout(() => {
          printWindow.print()
          // Window will stay open so user can choose to save as PDF
        }, 250)
      }
    }
  }

  if (!tasks || tasks.length === 0) return null

  // Calculate total price across all tasks
  const totalPrice = tasks.reduce((sum, task) => sum + task.price, 0)
  const invoiceNumber = propInvoiceNumber || tasks[0].id.toString()
  const invoiceDate = propInvoiceDate || tasks[0].createdAt
  const customerName = tasks[0].customer

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

    if (num === 0) return 'Zero'

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return ''
      if (n < 10) return ones[n]
      if (n < 20) return teens[n - 10]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
    }

    if (num < 1000) return convertLessThanThousand(num)
    if (num < 1000000) {
      return convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand' + 
             (num % 1000 !== 0 ? ' ' + convertLessThanThousand(num % 1000) : '')
    }
    return num.toString() // For larger numbers, just show the number
  }

  const totalInWords = numberToWords(Math.floor(totalPrice)) + ' Only'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice - #${invoiceNumber}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div 
          ref={invoiceRef}
          style={{
            backgroundColor: 'white',
            padding: '40px',
            color: 'black',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 5 }}>
              SIN SENG HONG SPRAY PAINTING & SERVICES
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              BLK 3023 A UBI ROAD 1<br />
              #01-63 SINGAPORE 408717<br />
              Tel: 96278521<br />
              e-mail: sinsenghongspray@hotmail.com<br />
              UEN: 44911800B
            </div>
          </div>


          {/* Customer Name */}
          <div style={{ marginBottom: 20, fontSize: 14, fontWeight: 'bold' }}>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
              Invoice No: {invoiceNumber}
            </div>
            <div style={{ fontSize: 12 }}>
              Date: {new Date(invoiceDate).toLocaleDateString('en-GB')}
            </div>
            To: {customerName}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #000', padding: 8, textAlign: 'left', fontSize: 12 }}>S/N</th>
                <th style={{ borderBottom: '1px solid #000', padding: 8, textAlign: 'left', fontSize: 12 }}>Particular</th>
                <th style={{ borderBottom: '1px solid #000', padding: 8, textAlign: 'center', fontSize: 12 }}>Quantity</th>
                <th style={{ borderBottom: '1px solid #000', padding: 8, textAlign: 'right', fontSize: 12 }}>Unit Price</th>
                <th style={{ borderBottom: '1px solid #000', padding: 8, textAlign: 'right', fontSize: 12 }}>Amount S$</th>
              </tr>
            </thead>
            <tbody>
              {/* Vehicle Details and Line Items */}
              {tasks.map((task, taskIdx) => (
                <tr key={task.id}>
                  <td style={{ padding: '2px 8px', paddingTop: taskIdx === 0 ? '8px' : '16px', fontSize: 12 }}>
                    {taskIdx + 1}.<br />
                    <br />
                    {task.lineItems?.map((_item, idx) => (
                      <span key={idx}>
                        <br />
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '2px 8px', paddingTop: taskIdx === 0 ? '8px' : '16px', fontSize: 12 }}>
                    {task.vehiclePlateNo}<br />
                    {task.vehicleMake} {task.vehicleModel}<br />
                    {task.lineItems?.map((item, idx) => (
                      <span key={idx}>
                        {item.description}<br />
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '2px 8px', paddingTop: taskIdx === 0 ? '8px' : '16px', fontSize: 12, textAlign: 'center' }}></td>
                  <td style={{ padding: '2px 8px', paddingTop: taskIdx === 0 ? '8px' : '16px', fontSize: 12, textAlign: 'right' }}>
                    <br /><br />
                    {task.lineItems?.map((item, idx) => (
                      <span key={idx}>
                        {item.amount.toFixed(2)}<br />
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '2px 8px', paddingTop: taskIdx === 0 ? '8px' : '16px', fontSize: 12, textAlign: 'right' }}>
                    <br /><br />
                    {task.lineItems?.map((item, idx) => (
                      <span key={idx}>
                        {item.amount.toFixed(2)}<br />
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {/* Empty rows for spacing */}
              {[...Array(Math.max(0, 3))].map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td style={{ padding: 8, fontSize: 12 }}>&nbsp;</td>
                  <td style={{ padding: 8, fontSize: 12 }}>&nbsp;</td>
                  <td style={{ padding: 8, fontSize: 12 }}>&nbsp;</td>
                  <td style={{ padding: 8, fontSize: 12 }}>&nbsp;</td>
                  <td style={{ padding: 8, fontSize: 12 }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ textAlign: 'right', fontSize: 12, marginTop: 10 }}>
            <div style={{ borderTop: '2px solid #000', paddingTop: 8, fontWeight: 'bold' }}>
              Total S$ : {totalPrice.toFixed(2)}
            </div>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: 8 }}>
              ========
            </div>
          </div>

          {/* Total in Words */}
          <div style={{ marginTop: 20, fontSize: 12 }}>
            Dollars: {totalInWords}
          </div>

          {/* Signature Section */}
          <div style={{ marginTop: 80, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 5, fontSize: 12 }}>
                Customer Signature & Co. Stamp
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 5, fontSize: 12 }}>
                SIN SENG HONG SPRAY PAINTING & SERVICES
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Save as PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Print Invoice
          </button>
        </div>
      </div>
    </Modal>
  )
}

